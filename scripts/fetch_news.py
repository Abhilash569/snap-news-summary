"""
Simple news fetcher and reporter.

Usage examples (PowerShell):

# Dry-run / basic call (provide your own URL and API key):
# $env:NEWS_API_KEY = '543b1c4c2d0a49368f78af517c010394'
# python .\scripts\fetch_news.py --url "https://example.com/api/news" --save news.json --report news_report.md

# Or pass api key on the command line:
# python .\scripts\fetch_news.py --api-key 543b1c4c2d0a49368f78af517c010394 --url "https://example.com/api/news"

The script will:
- Fetch JSON from the provided URL using either Bearer header or query param (try header first).
- Try to detect an articles list (common shape: {"articles": [...]}) or use top-level list.
- Print headline titles to console.
- Save raw JSON to a file if --save is provided.
- Generate a simple markdown report if --report is provided.
"""

from __future__ import annotations
import argparse
import json
import os
import sys
from typing import Any, Dict, List, Optional

import requests


def fetch_news(url: str, api_key: Optional[str] = None, params: Optional[Dict[str, Any]] = None, timeout: int = 15) -> Any:
    headers = {}
    if api_key:
        # Use Bearer token by default; some APIs use different auth — adapt if needed.
        headers['Authorization'] = f'Bearer {api_key}'

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=timeout)
    except Exception as e:
        print(f"Request error: {e}")
        raise

    if resp.status_code >= 400:
        # Try one fallback: if API expects API key as `apiKey` query param
        if api_key and ('apiKey' not in (params or {})):
            fallback_params = dict(params or {})
            fallback_params['apiKey'] = api_key
            print(f"Primary request returned {resp.status_code}. Trying fallback with apiKey query param...")
            resp2 = requests.get(url, params=fallback_params, timeout=timeout)
            if resp2.status_code < 400:
                return resp2.json()
            else:
                resp2.raise_for_status()
        resp.raise_for_status()

    # Return parsed JSON
    return resp.json()


def detect_articles(json_data: Any, category: Optional[str] = None) -> List[Dict[str, Any]]:
    # Common structures: {"articles": [...]}, or top-level list
    articles = []
    if isinstance(json_data, dict):
        if 'articles' in json_data and isinstance(json_data['articles'], list):
            articles = json_data['articles']
        else:
            # try keys that might contain lists of items
            for k, v in json_data.items():
                if isinstance(v, list):
                    articles = v
                    break
            if not articles:
                # Not a list-containing dict, wrap dict in a list
                articles = [json_data]
    elif isinstance(json_data, list):
        articles = json_data
    else:
        articles = [json_data]
    
    # Add category to articles if provided
    if category:
        for article in articles:
            if isinstance(article, dict):
                article['category'] = category
    
    return articles


def short_snippet(text: Optional[str], length: int = 200) -> str:
    if not text:
        return ''
    text = text.replace('\n', ' ').strip()
    if len(text) <= length:
        return text
    # return up to last space before length
    cut = text[:length]
    last_space = cut.rfind(' ')
    if last_space > 0:
        return cut[:last_space] + '...'
    return cut + '...'


def make_markdown_report(articles: List[Dict[str, Any]]) -> str:
    lines = ['# News Report', '', f'Total articles: {len(articles)}', '']
    for i, a in enumerate(articles, start=1):
        title = a.get('title') or a.get('headline') or 'No title'
        source = None
        if isinstance(a.get('source'), dict):
            source = a.get('source', {}).get('name')
        elif isinstance(a.get('source'), str):
            source = a.get('source')
        published = a.get('publishedAt') or a.get('published') or ''
        url = a.get('url') or a.get('link') or ''
        description = short_snippet(a.get('description') or a.get('summary') or a.get('content') or '', 240)

        lines.append(f'## {i}. {title}')
        if source:
            lines.append(f'*Source:* {source}')
        if published:
            lines.append(f'*Published:* {published}')
        if url:
            lines.append(f'*Link:* {url}')
        if description:
            lines.append('')
            lines.append(description)
        lines.append('')

    return '\n'.join(lines)


def save_json(path: str, data: Any, append: bool = False) -> None:
    if append and os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                if isinstance(existing_data, dict) and 'articles' in existing_data:
                    if isinstance(data, dict) and 'articles' in data:
                        existing_data['articles'].extend(data['articles'])
                        data = existing_data
                    elif isinstance(data, list):
                        existing_data['articles'].extend(data)
                        data = existing_data
        except Exception as e:
            print(f"Warning: Could not append to existing file: {e}", file=sys.stderr)
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def print_headlines(articles: List[Dict[str, Any]], limit: Optional[int] = 20) -> None:
    print('\nFetched articles:')
    for i, a in enumerate(articles[:limit], start=1):
        title = a.get('title') or a.get('headline') or 'No title'
        print(f"{i}. {title}")


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description='Fetch news JSON from an API and produce a small report.')
    parser.add_argument('--url', required=True, help='The API URL to fetch news from (must return JSON).')
    parser.add_argument('--api-key', help='API key (optional). If not set, will check NEWS_API_KEY env var.')
    parser.add_argument('--save', help='Path to save raw JSON (optional).')
    parser.add_argument('--append', action='store_true', help='Append to existing JSON file instead of overwriting')
    parser.add_argument('--category', help='News category (will be added to articles metadata)')
    parser.add_argument('--report', help='Path to save markdown report (optional).')
    parser.add_argument('--limit', type=int, default=20, help='How many headlines to print.')
    args = parser.parse_args(argv)

    api_key = args.api_key or os.environ.get('NEWS_API_KEY')
    if not api_key:
        print('Warning: no API key provided. Some APIs may fail without a key. You can set NEWS_API_KEY env var or pass --api-key.', file=sys.stderr)

    try:
        data = fetch_news(args.url, api_key=api_key)
    except Exception as e:
        print(f'Failed to fetch news: {e}', file=sys.stderr)
        return 2

    articles = detect_articles(data, args.category)
    if not articles:
        print('No articles detected in the returned JSON.', file=sys.stderr)
        return 3

    def get_article_key(article):
        return f"{article.get('title', '')}-{article.get('url', '')}"

    if args.save:
        # If appending and the target file exists
        if args.append and os.path.exists(args.save):
            try:
                with open(args.save, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                if isinstance(existing_data, dict) and 'articles' in existing_data:
                    # Create a set of existing article keys to avoid duplicates
                    existing_keys = {get_article_key(a) for a in existing_data['articles']}
                    # Only append articles that don't already exist
                    new_articles = [a for a in articles if get_article_key(a) not in existing_keys]
                    existing_data['articles'].extend(new_articles)
                    data = existing_data
                else:
                    data = {'articles': articles}
            except Exception as e:
                print(f'Error appending to existing file: {e}', file=sys.stderr)
                data = {'articles': articles}
        else:
            data = {'articles': articles}

    if args.save:
        try:
            save_json(args.save, data, append=args.append)
            print(f'{"Appended" if args.append else "Saved"} raw JSON to {args.save}')
        except Exception as e:
            print(f'Could not save JSON: {e}', file=sys.stderr)

    articles = detect_articles(data)
    if not articles:
        print('No articles detected in the returned JSON.', file=sys.stderr)
        return 3

    print_headlines(articles, limit=args.limit)

    if args.report:
        report_md = make_markdown_report(articles)
        try:
            with open(args.report, 'w', encoding='utf-8') as f:
                f.write(report_md)
            print(f'Wrote markdown report to {args.report}')
        except Exception as e:
            print(f'Could not write report: {e}', file=sys.stderr)

    return 0


if __name__ == '__main__':
    raise SystemExit(main())

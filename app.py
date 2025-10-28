from flask import Flask, render_template, jsonify
import json
from scripts.fetch_news import fetch_news, detect_articles, make_markdown_report
import os

app = Flask(__name__)

def load_news():
    try:
        with open('news.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('articles', [])
    except Exception as e:
        print(f"Error loading news: {e}")
        return []

@app.route('/')
def index():
    articles = load_news()
    return render_template('index.html', articles=articles)

@app.route('/api/news')
def get_news():
    articles = load_news()
    return jsonify({'articles': articles})

@app.route('/update_news')
def update_news():
    api_key = os.environ.get('NEWS_API_KEY')
    if not api_key:
        return jsonify({'error': 'No API key configured'}), 400

    try:
        url = f"https://newsapi.org/v2/top-headlines?country=us"
        data = fetch_news(url, api_key=api_key)
        articles = detect_articles(data)
        
        # Save to JSON file
        with open('news.json', 'w', encoding='utf-8') as f:
            json.dump({'articles': articles}, f, indent=2)
        
        # Generate report
        report = make_markdown_report(articles)
        with open('news_report.md', 'w', encoding='utf-8') as f:
            f.write(report)

        return jsonify({'success': True, 'count': len(articles)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
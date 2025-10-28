// Function to refresh news
async function refreshNews() {
    try {
        const response = await fetch('/update_news');
        const data = await response.json();
        if (data.success) {
            window.location.reload();
        } else {
            alert('Error updating news: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating news');
    }
}
// Import necessary libraries
const fs = require('fs');
const { GhostAdminAPI } = require('@tryghost/admin-api');
const Twit = require('twit');
const axios = require('axios');

// Read configuration from config.json
const config = JSON.parse(fs.readFileSync('config.json'));
const newsApiKey = config.news_api.api_key;

// Extract Ghost API and Twitter API keys from config
const ghostConfig = config.ghost;
const twitterConfig = config.twitter;

// Initialize Ghost API client
const ghost = new GhostAdminAPI({
    url: ghostConfig.api_url,
    key: ghostConfig.api_key,
    version: "v4"
});

// Initialize Twitter API client
const twitter = new Twit({
    consumer_key: twitterConfig.consumer_key,
    consumer_secret: twitterConfig.consumer_secret,
    access_token: twitterConfig.access_token,
    access_token_secret: twitterConfig.access_token_secret,
});

// Function to get trending topics from Twitter
function getTrendingTopics() {
    return new Promise((resolve, reject) => {
        twitter.get('trends/place', { id: 1 }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                const trendingTopics = data[0].trends.map(trend => trend.name);
                resolve(trendingTopics);
            }
        });
    });
}

// Function to generate report for a topic
async function generateReport(topic) {
    try {
        // Fetch news articles related to the topic from a news API
        const response = await axios.get(`https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&apiKey=YOUR_NEWS_API_KEY`);
        const articles = response.data.articles;

        // Extract the headline and description of the first article
        const article = articles.length > 0 ? articles[0] : null;
        const headline = article ? article.title : 'No news articles found';
        const description = article ? article.description : '';

        // Generate the report
        let report = `📰 Report for ${topic} 📰\n\n`;
        report += `🔍 Latest News: ${headline}\n`;
        report += `📝 Summary: ${description}\n`;

        return report;
    } catch (error) {
        console.error('Error fetching news:', error);
        return `Failed to fetch news for ${topic}.`;
    }
}

// Function to create and publish a post on Ghost blog
async function createAndPublishPost(title, content) {
    try {
        await ghost.posts.add({
            title: title,
            html: content,
            status: "published"
        });
        console.log(`Post "${title}" published successfully.`);
    } catch (error) {
        console.error(`Error publishing post "${title}":`, error);
    }
}

// Main function
async function main() {
    try {
        // Get trending topics from Twitter
        const trendingTopics = await getTrendingTopics();

        // Generate and publish reports for each trending topic
        for (const topic of trendingTopics.slice(0, 3)) {
            const reportContent = await generateReport(topic);
            const postTitle = `Trending: ${topic}`;
            await createAndPublishPost(postTitle, reportContent);
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

// Run the main function
main();

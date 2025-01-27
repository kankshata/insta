const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');

// Function to scrape followers and following from a profile
async function scrapeInstagramProfileData(page, profileUrl) {
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });

    // Wait for the profile header to load
    await page.waitForSelector('header', { visible: true });

    // Extract profile data including followers and following
    const profileData = await page.evaluate(() => {
        const counts = document.querySelectorAll('header section ul li span');
        const followers = counts[1]?.getAttribute('title') || '0';
        const following = counts[2]?.textContent.trim() || '0';
        
        // Extracting name
        const name = document.querySelector('h1')?.textContent || 'No name found';

        return { name, followers, following };
    });

    console.log(`Name: ${profileData.name}`);
    console.log(`Followers: ${profileData.followers}, Following: ${profileData.following}`);

    // Save profile data to `profile_data.json`
    fs.writeFileSync('profile_data.json', JSON.stringify(profileData, null, 2));
    console.log('Profile data saved to profile_data.json');

    return profileData;
}

// Function to scrape likes and comments from a post
async function scrapeInstagramPostData(page, postUrl) {
    await page.goto(postUrl, { waitUntil: 'networkidle2' });

    // Wait for the main article section
    await page.waitForSelector('article', { visible: true });

    // Extract likes count
    const postLikes = await page.evaluate(() => {
        const likeElement = document.querySelector('article section span > span');
        if (likeElement) {
            return likeElement.textContent.trim();
        }
        const likesButton = document.querySelector('article section div > button span');
        if (likesButton) {
            return likesButton.textContent.trim();
        }
        return '0'; // Fallback if no likes are found
    });

    console.log(`Post Likes: ${postLikes}`);

    // Scroll to load comments
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Wait for comments to load (using a delay)
    await new Promise(resolve => setTimeout(resolve, 5000)); // Delay for 5 seconds

    // Extract comments
    const comments = await page.evaluate(() => {
        const commentElements = document.querySelectorAll('ul li:not([role="menuitem"])');
        return Array.from(commentElements).map(comment => {
            const user = comment.querySelector('h3')?.textContent || 'Unknown User';
            const text = comment.querySelector('span')?.textContent || 'No Comment';
            return { user, text };
        });
    });

    // Save likes count to post_like.json
    fs.writeFileSync('post_like.json', JSON.stringify({ postLikes }, null, 2));
    console.log('Post likes saved to post_like.json');

    // Save comments to post_data.json
    const scrapedData = { comments };
    fs.writeFileSync('post_data.json', JSON.stringify(scrapedData, null, 2));
    console.log('Scraped comments saved to post_data.json');

    return { postLikes, comments };
}

// Main function to scrape data
async function scrapeData(url) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        if (url.includes('/p/')) { // Instagram post URL
            const postData = await scrapeInstagramPostData(page, url);
            console.log('Scraped Post Data:', postData);
        } else if (url.includes('instagram.com/')) { // Instagram profile URL
            const profileData = await scrapeInstagramProfileData(page, url);
            console.log('Scraped Profile Data:', profileData);
        } else {
            console.log('Invalid URL. Please provide a valid Instagram profile or post link.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

// User input handling
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter Instagram profile URL or post URL: ', (url) => {
    scrapeData(url).then(() => rl.close());
});

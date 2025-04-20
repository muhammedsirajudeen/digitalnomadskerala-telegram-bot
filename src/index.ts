import { configDotenv } from 'dotenv'
import TelegramBot from 'node-telegram-bot-api'
import fetch from 'node-fetch';
configDotenv()

const token = process.env.BOT_TOKEN || 'BOT_TOKEN'
const GROUP_ID = parseInt(process.env.GROUP_ID || 'CHAT ID')
const THREAD_ID = parseInt(process.env.THREAD_ID || 'THREAD_ID')

if (!token) {
    throw new Error('Set the token in the env bro')
}
if (!GROUP_ID) {
    throw new Error('Set the group id in env')
}
if (!THREAD_ID) {
    throw new Error('Set the thread id in env')
}
if (!isWithinISTWorkingHours()) {
    console.log('\x1b[33m%s\x1b[0m', 'Within bounds of 8 A.M to 8 P.M');
    process.exit(0)
}

const bot = new TelegramBot(token, { polling: true })

interface Job {
    id: number;
    url: string;
    title: string;
    company_name: string;
    company_logo: string;
    category: string;
    job_type?: string;
    publication_date: string;
    candidate_required_location: string;
    salary?: string;
    description: string;
    tags: string[]
}

interface JobsResponse {
    "0-legal-notice": string;
    "job-count": number;
    jobs: Job[];
}
async function fetchJob() {
    try {
        const response = await fetch('https://remotive.com/api/remote-jobs?limit=100');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json() as JobsResponse;
        return data.jobs
    } catch (error) {
        console.error('Error fetching job:', error);
    }
}

function isWithinISTWorkingHours(): boolean {
    const now = new Date();

    // Convert UTC to IST (+5:30)
    const istOffset = 5.5 * 60; // in minutes
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + istOffset * 60000);

    const hour = istTime.getHours();
    return hour >= 8 && hour < 20; // Between 8 AM and 8 PM IST
}


async function sendJobs() {
    const jobs = await fetchJob();
    if (!jobs) {
        return
    }
    const filteredJobs = jobs.filter((job) => job.candidate_required_location === 'Worldwide' || job.candidate_required_location === 'India')
    if (filteredJobs.length === 0) {
        return
    }
    let count = 0
    for (const job of filteredJobs) {
        const message = `
        📌 *${job.title}*  
        🏢 *Company:* ${job.company_name}  
        🌍 *Location:* ${job.candidate_required_location}  
        💼 *Category:* ${job.category}  
        💰 *Salary:* ${job.salary || 'Not specified'}  
        🕒 *Published on:* ${new Date(job.publication_date).toLocaleDateString()}  
        
        🔗 [View Job Posting](${job.url})
                `;
        try {
            await new Promise(resolve => setTimeout(resolve, 5000));
            bot.sendMessage(GROUP_ID, message, {
                message_thread_id: THREAD_ID,
                parse_mode: 'Markdown',
                disable_notification: true
            });
            count++
            if (count === 5) {
                console.log(`Finished sending ${count} Messages`)
                process.exit(0)
            }
        } catch (error) {
            console.error('\x1b[31m%s\x1b[0m', 'Error in sending message to telegram group');
        }
    }
}

sendJobs()

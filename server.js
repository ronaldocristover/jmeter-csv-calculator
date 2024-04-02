const express = require('express');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const app = express();
const port = 3000;

// Function to read CSV and calculate metrics
// Function to read CSV from a URL
async function readCSVFromURL(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error reading CSV from URL:', error);
        return null;
    }
}

// Function to process CSV from a URL
async function processCSVFromURL(url) {
    const csvData = await readCSVFromURL(url);
    if (csvData) {
        const result = Papa.parse(csvData, { header: true, dynamicTyping: true });
        const data = result.data;

        // Error Analysis
        const totalTransactions = data.length;
        const errorData = data.filter(row => row.success === false);
        let errorDetails = {};

        // Calculate response times
        const totalResponseTime = data.reduce((total, row) => total + row.elapsed, 0);
        const averageResponseTime = totalResponseTime / data.length;
        const maxResponseTime = Math.max(...data.map(row => row.elapsed));
        const minResponseTime = Math.min(...data.map(row => row.elapsed));

        errorData.forEach(row => {
            const errorCode = row.responseCode.toString();
            errorDetails[errorCode] = (errorDetails[errorCode] || { total: 0, percentage: 0 });
            errorDetails[errorCode].total += 1;
        });

        Object.keys(errorDetails).forEach(code => {
            errorDetails[code].percentage = (errorDetails[code].total / totalTransactions) * 100;
        });

        // Convert errorDetails to required array format
        const errorDetailsArray = Object.keys(errorDetails).map(code => ({
            kode: parseInt(code),
            total: errorDetails[code].total,
            persentase: errorDetails[code].percentage.toFixed(2)
        }));

        // Other Calculations
        const totalSuccess = data.filter(row => row.success).length;
        const totalFailed = totalTransactions - totalSuccess;
        const startTime = Math.min(...data.map(row => row.timeStamp));
        const endTime = Math.max(...data.map(row => row.timeStamp));
        const durationSeconds = (endTime - startTime) / 1000;
        const tps = totalTransactions / durationSeconds;
        const successPercentage = (totalSuccess / totalTransactions) * 100;
        const failurePercentage = (totalFailed / totalTransactions) * 100;

        return {
            averageTPS: tps,
            totalSamples: totalTransactions,
            totalSuccess: totalSuccess,
            totalFailed: totalFailed,
            successPercentage: successPercentage,
            failurePercentage: failurePercentage,
            errorDetails: errorDetailsArray,
            averageResponseTime: averageResponseTime,
            maxResponseTime: maxResponseTime,
            minResponseTime: minResponseTime
        };
    } else {
        // Return null or handle the error
        return null;
    }
}
function processCSV(filePath) {
    const file = fs.readFileSync(filePath, 'utf8');
    const result = Papa.parse(file, { header: true, dynamicTyping: true });
    const data = result.data;

    // Error Analysis
    const totalTransactions = data.length;
    const errorData = data.filter(row => row.success === false);
    let errorDetails = {};

    // Calculate response times
    const totalResponseTime = data.reduce((total, row) => total + row.elapsed, 0);
    const averageResponseTime = totalResponseTime / data.length;
    const maxResponseTime = Math.max(...data.map(row => row.elapsed));
    const minResponseTime = Math.min(...data.map(row => row.elapsed));

    errorData.forEach(row => {
        const errorCode = row.responseCode.toString();
        errorDetails[errorCode] = (errorDetails[errorCode] || { total: 0, percentage: 0 });
        errorDetails[errorCode].total += 1;
    });

    Object.keys(errorDetails).forEach(code => {
        errorDetails[code].percentage = (errorDetails[code].total / totalTransactions) * 100;
    });

    // Convert errorDetails to required array format
    const errorDetailsArray = Object.keys(errorDetails).map(code => ({
        kode: parseInt(code),
        total: errorDetails[code].total,
        persentase: errorDetails[code].percentage.toFixed(2)
    }));

    // Other Calculations
    const totalSuccess = data.filter(row => row.success).length;
    const totalFailed = totalTransactions - totalSuccess;
    const startTime = Math.min(...data.map(row => row.timeStamp));
    const endTime = Math.max(...data.map(row => row.timeStamp));
    const durationSeconds = (endTime - startTime) / 1000;
    const tps = totalTransactions / durationSeconds;
    const successPercentage = (totalSuccess / totalTransactions) * 100;
    const failurePercentage = (totalFailed / totalTransactions) * 100;

    return {
        averageTPS: tps,
        totalSamples: totalTransactions,
        totalSuccess: totalSuccess,
        totalFailed: totalFailed,
        successPercentage: successPercentage,
        failurePercentage: failurePercentage,
        errorDetails: errorDetailsArray,
        averageResponseTime: averageResponseTime,
        maxResponseTime: maxResponseTime,
        minResponseTime: minResponseTime
    };
}

function processAllCSV(folderPath) {
    const files = fs.readdirSync(folderPath);
    const csvFiles = files.filter(file => path.extname(file).toLowerCase() === '.csv');

    const results = csvFiles.map(file => {
        const filePath = path.join(folderPath, file);
        const metrics = processCSV(filePath);
        return {
            file: file,
            metrics: metrics
        };
    });

    return results;
}

app.get('/process-link-csv', async (req, res) => {
    const url = 'https://jmeter-doa-abc-prod.oss-ap-southeast-5.aliyuncs.com/result/10.csv'; // Replace with the path to your folder containing CSV files
    const allMetrics = await processCSVFromURL(url);
    console.log(allMetrics);
    res.json(allMetrics);
});

// Endpoint to process all CSV files in a folder
app.get('/process-all-csv', (req, res) => {
    const folderPath = './result'; // Replace with the path to your folder containing CSV files
    const allMetrics = processAllCSV(folderPath);
    res.json(allMetrics);
});

// Endpoint
app.get('/metrics', (req, res) => {
    const metrics = processCSV('5-d.csv'); // Replace with the path to your CSV file
    res.json(metrics);
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

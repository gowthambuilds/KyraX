import axios from 'axios';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { logger } from '#utils/logger';

// Function to download an image from URL
async function downloadImage(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data, 'binary');
    } catch (error) {
        logger.error('ImageProcessor', 'Error downloading image', error);
        throw new Error('Failed to download image for processing');
    }
}

// Function to preprocess image for better OCR results
async function preprocessImage(imageBuffer) {
    try {
        // Enhanced preprocessing pipeline for better OCR results
        return await sharp(imageBuffer)
            // Convert to grayscale
            .grayscale()
            // Increase contrast
            .normalize()
            // Apply slight sharpening to make text more distinct
            .sharpen({
                sigma: 1.2,
                m1: 0.5,
                m2: 0.5
            })
            // Apply threshold to make text clearer on light backgrounds
            .threshold(180)
            // Resize if necessary to improve OCR
            .resize({
                width: 1600,
                height: 1200,
                fit: 'inside', // Maintain aspect ratio
                withoutEnlargement: true
            })
            .toBuffer();
    } catch (error) {
        logger.error('ImageProcessor', 'Error preprocessing image', error);
        // Return original buffer if preprocessing fails
        return imageBuffer;
    }
}

// Main function to process verification images
export async function processImage(imageUrl) {
    try {
        logger.debug('ImageProcessor', `Processing image from URL: ${imageUrl}`);

        // Download and preprocess the image
        const imageBuffer = await downloadImage(imageUrl);
        const processedBuffer = await preprocessImage(imageBuffer);

        // Initialize Tesseract OCR with the new API (v6+)
        // Perform OCR on the image using the newer API
        const result = await Tesseract.recognize(processedBuffer, 'eng', {
            // logger: m => {
            //   if (m.status === 'recognizing text') {
            //    // console.log(`OCR progress: ${Math.floor(m.progress * 100)}%`);
            //   }
            // }
        });

        logger.debug('ImageProcessor', `OCR completed, text length: ${result.data.text.length}`);

        // Look for subscription indicators in the text
        const text = result.data.text.toLowerCase();

        // Enhanced check for common phrases that indicate a YouTube subscription
        const subscriptionIndicators = [
            'subscribed',
            'subscription',
            'subscriber',
            'bell icon',
            'notifications',
            'joined',
            'following',  // Additional indicators
            'subscrib',   // Partial match for OCR errors
            'joined channel',
            'membership'
        ];

        // Use a more flexible detection approach to handle OCR errors
        const foundIndicators = [];
        for (const indicator of subscriptionIndicators) {
            if (text.includes(indicator)) {
                foundIndicators.push(indicator);
            }
        }

        // Enhanced checkmark detection
        const checkmarks = ['✓', '√', '✔', 'v', '✅'];
        let hasSubscribeCheckmark = false;

        // Check for "subscribe" + any checkmark nearby
        if (text.includes('subscribe')) {
            for (const checkmark of checkmarks) {
                if (text.includes(checkmark)) {
                    hasSubscribeCheckmark = true;
                    foundIndicators.push(`subscribe with ${checkmark}`);
                    break;
                }
            }
        }

        // Look for checkmarks in proximity to "subscribe" word
        const subscribePos = text.indexOf('subscribe');
        if (subscribePos !== -1) {
            // Check if there's a checkmark within 20 characters of "subscribe"
            const segment = text.substring(Math.max(0, subscribePos - 10),
                Math.min(text.length, subscribePos + 20));

            for (const checkmark of checkmarks) {
                if (segment.includes(checkmark)) {
                    hasSubscribeCheckmark = true;
                    foundIndicators.push(`subscribe near ${checkmark}`);
                    break;
                }
            }
        }

        // Check for "subscribed" button UI elements
        const hasSubscribedButton = text.includes('subscrib') &&
            (text.includes('button') || text.includes('ed'));

        if (hasSubscribedButton) {
            foundIndicators.push('subscribed button detected');
        }

        // Calculate final subscription status
        const isSubscribed = foundIndicators.length > 0 || hasSubscribeCheckmark || hasSubscribedButton;

        // Look for a YouTube user ID or channel name
        const userIdPatterns = [
            /user\/([a-zA-Z0-9_-]+)/,
            /channel\/([a-zA-Z0-9_-]+)/,
            /youtube\.com\/@([a-zA-Z0-9_-]+)/
        ];

        let userId = null;
        for (const pattern of userIdPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                userId = match[1];
                break;
            }
        }

        // If we found subscription indicators
        if (isSubscribed) {
            logger.info('ImageProcessor', 'Subscription verification successful');
            return {
                success: true,
                userId: userId,
                hasSubscriptionIndicators: true,
                foundIndicators: foundIndicators
            };
        }

        // If no subscription indicators were found
        logger.info('ImageProcessor', 'Could not detect subscription indicators');
        return {
            success: false,
            message: 'Could not detect subscription indicators in the image'
        };

    } catch (error) {
        logger.error('ImageProcessor', 'Error processing validation image', error);
        return {
            success: false,
            message: `Error processing image: ${error.message}`,
            error: error.message
        };
    }
}

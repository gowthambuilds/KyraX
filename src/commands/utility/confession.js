import { AttachmentBuilder } from 'discord.js';
import { KyraUI } from '#classes/KyraUI';

// Lazy load canvas to prevent startup crashes on systems with missing native dependencies
let canvasLoaded = false;
let createCanvas, loadImage;

async function loadCanvas() {
    if (canvasLoaded) return true;
    try {
        const canvas = await import('@napi-rs/canvas');
        createCanvas = canvas.createCanvas;
        loadImage = canvas.loadImage;
        canvasLoaded = true;
        return true;
    } catch (e) {
        return false;
    }
}

export default {
    name: 'confession',
    description: 'Share your message as a high-definition noir cinematic image',
    slash: true,
    options: [
        { name: 'message', description: 'The message you want to share', type: 3, required: true }
    ],
    async execute({ client, message, interaction, args }) {
        const isSlash = !!interaction;
        const text = isSlash ? interaction.options.getString('message') : args.join(' ');

        if (!text) {
            const usage = isSlash ? '/confession message: <message>' : `${client.prefix}confession <message>`;
            return KyraUI.sendUsage({ client, message, interaction }, usage);
        }

        if (isSlash) await interaction.deferReply();

        // Ensure canvas is loaded
        const isCanvasReady = await loadCanvas();
        if (!isCanvasReady) {
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} This command is currently unavailable due to missing system dependencies (\`canvas\`).`);
            if (isSlash) return interaction.editReply({ components: errorContainer });
            else return message.reply({ components: errorContainer });
        }

        try {
            // 1. Initialize Large Cinematic Canvas
            const canvas = createCanvas(1200, 600);
            const ctx = canvas.getContext('2d');

            // 2. The Noir Foundation
            ctx.fillStyle = '#020202';
            ctx.fillRect(0, 0, 1200, 600);

            const spotlight = ctx.createRadialGradient(900, 300, 0, 900, 300, 500);
            spotlight.addColorStop(0, '#0a0a0a');
            spotlight.addColorStop(1, '#020202');
            ctx.fillStyle = spotlight;
            ctx.fillRect(500, 0, 700, 600);

            // 3. High-Definition Avatar presence (CIRCULAR & FADING)
            const user = isSlash ? interaction.user : message.author;
            const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 1024 });
            const avatar = await loadImage(avatarUrl);

            const avatarSize = 900;
            const avatarX = -150; // Tucked slightly more for better circular framing
            const avatarY = (600 - avatarSize) / 2;

            ctx.save();
            const avatarCanvas = createCanvas(avatarSize, avatarSize);
            const avatarCtx = avatarCanvas.getContext('2d');
            
            // --- NEW: Circular Mask ---
            avatarCtx.beginPath();
            avatarCtx.arc(avatarSize / 2, avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            avatarCtx.clip();
            avatarCtx.drawImage(avatar, 0, 0, avatarSize, avatarSize);
            
            // --- Fade Mask (Applied to the Circle) ---
            const maskGradient = avatarCtx.createLinearGradient(0, 0, avatarSize, 0);
            maskGradient.addColorStop(0.1, 'rgba(0, 0, 0, 1)'); 
            maskGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)'); 
            maskGradient.addColorStop(0.9, 'rgba(0, 0, 0, 0)'); 
            
            avatarCtx.globalCompositeOperation = 'destination-in';
            avatarCtx.fillStyle = maskGradient;
            avatarCtx.fillRect(0, 0, avatarSize, avatarSize);
            
            ctx.globalAlpha = 0.85;
            ctx.drawImage(avatarCanvas, avatarX, avatarY);
            ctx.restore();

            // 4. Content Area
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(600, 150);
            ctx.lineTo(600, 450);
            ctx.stroke();

            // 5. Typography Layer
            // A. Identity String
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.font = 'bold 16px Arial';
            ctx.letterSpacing = '6px';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillText(user.username.toUpperCase(), 1140, 60);
            
            ctx.font = '11px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillText('NOIR PRIVATE RECORDS | ENCRYPTED', 1140, 85);

            // B. Main Quote (The Message) - DYNAMIC SIZING ENGINE
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFFFFF';
            
            // Dynamic Font Logic
            let fontSize = 44;
            let lineHeight = 58;
            const maxWidth = 500;
            const maxHeight = 350;
            let finalLines = [];

            const getLines = (context, text, maxWidth) => {
                const words = text.split(' ');
                const lines = [];
                let currentLine = words[0];

                for (let i = 1; i < words.length; i++) {
                    const word = words[i];
                    const width = context.measureText(currentLine + " " + word).width;
                    if (width < maxWidth) {
                        currentLine += " " + word;
                    } else {
                        lines.push(currentLine);
                        currentLine = word;
                    }
                }
                lines.push(currentLine);
                return lines;
            };

            // Loop to reduce font size until text fits
            while (fontSize > 18) {
                ctx.font = `italic ${fontSize}px Georgia`;
                finalLines = getLines(ctx, `“${text}”`, maxWidth);
                if ((finalLines.length * lineHeight) <= maxHeight) break;
                fontSize -= 2;
                lineHeight -= 2;
            }

            // Draw final wrapped and scaled text
            let startY = 300 - ((finalLines.length - 1) * lineHeight) / 2;
            
            // Add a "Drop Shadow" glow effect
            ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
            ctx.shadowBlur = 10;
            
            finalLines.forEach((line, index) => {
                ctx.fillText(line, 650, startY + (index * lineHeight));
            });
            ctx.shadowBlur = 0;

            // 6. Brutalist Bottom Branding
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.letterSpacing = '3px';
            ctx.fillText(`KYRA X | HIGH-END SHARING | SECTOR_${Date.now().toString().slice(-4)}`, 1140, 560);

            // 7. Output Response
            const buffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(buffer, { name: 'confession_noir_v3.png' });

            if (isSlash) {
                await interaction.editReply({ files: [attachment] });
            } else {
                await message.reply({ files: [attachment] });
            }

        } catch (error) {
            client.logger.error('Confession', 'Failed to generate Noir V3 image', error);
            const errorContainer = KyraUI.buildSimpleMessage(`${client.config.emojis.error} Cinematic rendering sequence failed.`);
            if (isSlash) await interaction.editReply({ components: errorContainer });
            else await message.reply({ components: errorContainer });
        }
    }
};

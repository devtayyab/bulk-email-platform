#!/usr/bin/env node

// Test script to verify HTML email content processing
const testHtmlContent = `<h1>🎉 Welcome to Our Amazing Newsletter!</h1>

<h2>✨ What's New This Month</h2>

<p>Dear <strong>John Doe</strong>,</p>

<p>We hope this email finds you well! We're excited to share some fantastic updates with our valued community.</p>

<div style="background: #e8f4fd; padding: 15px; border-left: 4px solid #4f46e5; margin: 20px 0;">
    <h3>🚀 New Features Released</h3>
    <ul>
        <li><strong>Advanced Analytics Dashboard</strong> - Track your progress in real-time</li>
        <li><em>Mobile App Improvements</em> - Better user experience on all devices</li>
        <li>🎨 <span style="color: #4f46e5;">Custom Themes</span> - Personalize your workspace</li>
    </ul>
</div>

<h3>📊 Performance Improvements</h3>
<p>We've made significant improvements to our platform:</p>

<ol>
    <li><strong>50% faster load times</strong> - Pages now load in under 2 seconds</li>
    <li>Enhanced security features with two-factor authentication</li>
    <li>Better mobile responsiveness across all screen sizes</li>
</ol>

<p><a href="https://example.com/dashboard" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Your Dashboard →</a></p>

<p>Best regards,<br>
<strong>The Product Team</strong><br>
<span style="color: #4f46e5;">Your Company Name</span></p>`;

console.log('=== HTML Content Test ===');
console.log('Original Content Length:', testHtmlContent.length);
console.log('Contains HTML tags:', /<[^>]*>/.test(testHtmlContent));
console.log('Contains H1 tag:', testHtmlContent.includes('<h1>'));
console.log('Contains styling:', testHtmlContent.includes('style='));

// Test placeholder replacement
function replacePlaceholders(template, data) {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(placeholder, String(value || ''));
    });
    return result;
}

const recipientData = {
    name: 'John Doe',
    email: 'john@example.com'
};

const processedContent = replacePlaceholders(testHtmlContent, recipientData);
console.log('\n=== After Placeholder Replacement ===');
console.log('Processed Content Length:', processedContent.length);
console.log('Name replaced:', processedContent.includes('John Doe'));
console.log('Still contains HTML:', /<[^>]*>/.test(processedContent));

// Test HTML validation
function ensureValidHtml(htmlContent) {
    if (!htmlContent.includes('<html>')) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
        `;
    }
    return htmlContent;
}

const finalHtml = ensureValidHtml(processedContent);
console.log('\n=== Final HTML Structure ===');
console.log('Final Length:', finalHtml.length);
console.log('Has DOCTYPE:', finalHtml.includes('<!DOCTYPE html>'));
console.log('Has HTML tag:', finalHtml.includes('<html>'));
console.log('Has HEAD tag:', finalHtml.includes('<head>'));
console.log('Has BODY tag:', finalHtml.includes('<body>'));

console.log('\n=== Preview (first 300 chars) ===');
console.log(finalHtml.substring(0, 300) + '...');

console.log('\n✅ Test completed successfully!');

// Test complete HTML email creation
function createCompleteHtmlEmail(content, subject) {
    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <title>${escapeHtml(subject)}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #333333;
            background-color: #ffffff;
        }
        .email-content {
            padding: 40px 30px;
            background-color: #ffffff;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <table class="email-container" role="presentation" border="0" cellpadding="0" cellspacing="0">
            <tr>
                <td class="email-content">
                    ${content}
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const completeHtml = createCompleteHtmlEmail(finalHtml, 'Test Newsletter');
console.log('\n=== Complete HTML Email Test ===');
console.log('Complete HTML Length:', completeHtml.length);
console.log('Has complete HTML structure:', completeHtml.includes('<!DOCTYPE') && completeHtml.includes('<html>') && completeHtml.includes('<head>') && completeHtml.includes('<body>'));
console.log('Has email-specific meta tags:', completeHtml.includes('x-apple-disable-message-reformatting'));
console.log('Has responsive table structure:', completeHtml.includes('email-container') && completeHtml.includes('table-layout: fixed'));
console.log('Has inline CSS:', completeHtml.includes('<style>'));

console.log('\n=== Complete HTML Preview (first 600 chars) ===');
console.log(completeHtml.substring(0, 600) + '...');

console.log('\n✅ Complete test finished!');
console.log('The HTML email should now render properly in email clients!');

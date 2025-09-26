#!/usr/bin/env node

/**
 * SQS Configuration Test Script
 *
 * This script tests the SQS configuration to ensure messages can be sent and received properly.
 * Run this script to diagnose SQS connectivity issues.
 */

const { SQSClient, SendMessageCommand, ReceiveMessageCommand } = require('@aws-sdk/client-sqs');
require('dotenv').config();

async function testSQSConnection() {
  console.log('🔍 Testing SQS Configuration...\n');

  // Get configuration from environment variables
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const queueUrl = process.env.AWS_SQS_QUEUE_URL;
  const dlqUrl = process.env.AWS_SQS_DLQ_URL;

  console.log('📋 Configuration:');
  console.log(`   Region: ${region}`);
  console.log(`   Access Key ID: ${accessKeyId ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Secret Access Key: ${secretAccessKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Queue URL: ${queueUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DLQ URL: ${dlqUrl ? '✅ Set' : '❌ Missing'}\n`);

  // Check for missing configuration
  if (!accessKeyId || !secretAccessKey || !queueUrl || !dlqUrl) {
    console.error('❌ Missing required AWS SQS configuration. Please check your environment variables.');
    process.exit(1);
  }

  // Initialize SQS client
  const sqsClient = new SQSClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    // Test message sending
    console.log('📤 Testing message sending...');
    const testMessage = {
      campaignId: 'test-campaign',
      jobId: 'test-job',
      recipientEmail: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      recipientData: { name: 'Test User' }
    };

    const sendCommand = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(testMessage),
    });

    await sqsClient.send(sendCommand);
    console.log('✅ Message sent successfully\n');

    // Test message receiving
    console.log('📥 Testing message receiving...');
    const receiveCommand = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 5, // Short wait time for testing
    });

    const response = await sqsClient.send(receiveCommand);
    const messages = response.Messages || [];

    if (messages.length > 0) {
      console.log(`✅ Received ${messages.length} message(s)`);
      console.log('📄 Message details:');
      messages.forEach((msg, index) => {
        console.log(`   Message ${index + 1}:`);
        console.log(`     Body: ${msg.Body}`);
        console.log(`     Receipt Handle: ${msg.ReceiptHandle?.substring(0, 50)}...`);
      });
    } else {
      console.log('⚠️  No messages received. This might be normal if the queue is empty.');
    }

    console.log('\n✅ SQS configuration test completed successfully!');
    console.log('💡 If you see this message, your SQS setup is working correctly.');

  } catch (error) {
    console.error('\n❌ SQS configuration test failed:');
    console.error(`   Error: ${error.message}`);

    if (error.message.includes('credentials')) {
      console.error('   💡 This looks like a credentials issue. Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    } else if (error.message.includes('queue')) {
      console.error('   💡 This looks like a queue URL issue. Check your AWS_SQS_QUEUE_URL.');
    } else if (error.message.includes('region')) {
      console.error('   💡 This looks like a region issue. Check your AWS_REGION.');
    }
  }
}

// Run the test
testSQSConnection().catch(console.error);

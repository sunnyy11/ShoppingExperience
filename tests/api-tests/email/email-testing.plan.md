# Email Testing Test Plan

## Overview

Comprehensive email testing using Mailosaur API with Playwright, covering all scenarios documented in Mailosaur's Playwright email testing guide.

## Test Scenarios

### 1. Basic Email Properties Testing

**Title:** Verify basic email properties (from, to, subject, CC, BCC)

**Steps:**

1. Send email to Mailosaur inbox
2. Retrieve email using `messages.get()`
3. Verify sender name and email
4. Verify recipient name and email
5. Verify subject line
6. Verify CC recipients (if applicable)
7. Verify BCC recipients (if applicable)

**Expected:** All properties match expected values

---

### 2. HTML Content Testing

**Title:** Verify HTML email content

**Steps:**

1. Retrieve email with HTML content
2. Check `message.html.body` contains expected content
3. Verify specific HTML elements are present
4. Verify HTML structure and formatting

**Expected:** HTML content matches expected content

---

### 3. Plain Text Content Testing

**Title:** Verify plain text email content

**Steps:**

1. Retrieve email with plain text content
2. Check `message.text.body` contains expected content
3. Verify text formatting and line breaks

**Expected:** Plain text content matches expected content

---

### 4. Link Testing

**Title:** Verify links in email content

**Steps:**

1. Retrieve email with links
2. Extract links from `message.html.links` array
3. Verify link text matches expected
4. Verify link href matches expected URL
5. Extract links from `message.text.links` array
6. Simulate clicking link via HTTP request
7. Verify HTTP response status is 200

**Expected:** All links are valid and accessible

---

### 5. Verification Code Testing

**Title:** Verify OTP/verification codes in email

**Steps:**

1. Retrieve email containing verification code
2. Extract codes from `message.html.codes` array
3. Verify code value matches expected pattern
4. Extract codes from `message.text.codes` array
5. Use code in application flow

**Expected:** Codes are correctly extracted and valid

---

### 6. Attachment Testing

**Title:** Verify email attachments

**Steps:**

1. Retrieve email with attachments
2. Check `message.attachments.length`
3. Verify first attachment properties:
   - fileName
   - contentType
   - length
4. Download attachment using `files.getAttachment()`
5. Save attachment to disk
6. Verify file content
7. Encode attachment as base64

**Expected:** All attachments are correctly received and accessible

---

### 7. Image and Web Beacon Testing

**Title:** Verify images and web beacons in email

**Steps:**

1. Retrieve email with HTML images
2. Check `message.html.images.length`
3. Verify first image properties:
   - src (URL)
   - alt text
4. Make HTTP request to image src
5. Verify HTTP response status is 200 (web beacon triggered)

**Expected:** All images are accessible and web beacons work

---

### 8. Email Sending Testing

**Title:** Send outbound email via Mailosaur API

**Steps:**

1. Use `messages.create()` to send email
2. Verify email sent successfully
3. Verify email appears in recipient inbox
4. Test with attachments (base64 encoded)

**Expected:** Email sent and received successfully

---

### 9. Email Reply Testing

**Title:** Reply to email via Mailosaur API

**Steps:**

1. Retrieve original message
2. Use `messages.reply()` to send reply
3. Verify reply sent successfully
4. Verify reply content

**Expected:** Reply sent and original sender receives it

---

### 10. Email Forwarding Testing

**Title:** Forward email via Mailosaur API

**Steps:**

1. Retrieve original message
2. Use `messages.forward()` to forward email
3. Verify forward sent successfully
4. Verify forwarded content

**Expected:** Email forwarded successfully

---

### 11. Message Deletion Testing

**Title:** Delete individual and all messages

**Steps:**

1. Delete single message using `messages.del()`
2. Verify message deleted
3. Delete all messages using `messages.deleteAll()`
4. Verify inbox is empty

**Expected:** Messages deleted successfully

---

### 12. Time Range Search Testing

**Title:** Search emails with custom time range

**Steps:**

1. Send email
2. Wait briefly
3. Search with `receivedAfter` parameter (yesterday)
4. Verify email found
5. Search without time range (default 1 hour)
6. Verify email found

**Expected:** Time range search works correctly

---

### 13. Multiple Message Search Testing

**Title:** Search for multiple messages matching criteria

**Steps:**

1. Send multiple emails to same address
2. Use `messages.search()` with pagination
3. Verify multiple results returned
4. Get full message for each result using `getById()`

**Expected:** Multiple messages retrieved correctly

---

### 14. Unique Email Address Generation

**Title:** Generate unique email addresses for test isolation

**Steps:**

1. Use `servers.generateEmailAddress()`
2. Verify format matches server domain
3. Use unique address for each test
4. Verify no cross-test contamination

**Expected:** Unique addresses generated and isolated

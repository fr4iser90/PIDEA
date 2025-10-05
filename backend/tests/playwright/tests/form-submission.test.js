const { test, expect } = require('@playwright/test');
const testData = require('../fixtures/test-data.json');

/**
 * Form Submission Test Suite
 * 
 * Tests various form submission scenarios including:
 * - Contact form submission
 * - Registration form submission
 * - Form validation
 * - Error handling
 */
test.describe('Form Submission Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(testData.urls.login);
    await page.fill(testData.selectors.login.usernameField, testData.testData.login.validCredentials.username);
    await page.fill(testData.selectors.login.passwordField, testData.testData.login.validCredentials.password);
    await page.click(testData.selectors.login.loginButton);
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');
  });
  
  test('should submit contact form successfully', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    // Check if contact form exists
    const contactForm = page.locator('.contact-form');
    if (await contactForm.isVisible()) {
      // Fill contact form
      await page.fill('input[name="name"]', testData.testData.forms.contactForm.name);
      await page.fill('input[name="email"]', testData.testData.forms.contactForm.email);
      await page.fill('textarea[name="message"]', testData.testData.forms.contactForm.message);
      
      // Submit form
      await page.click(testData.selectors.forms.submitButton);
      
      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Message sent successfully');
      
      // Form should be reset
      await expect(page.locator('input[name="name"]')).toHaveValue('');
      await expect(page.locator('input[name="email"]')).toHaveValue('');
      await expect(page.locator('textarea[name="message"]')).toHaveValue('');
    }
  });
  
  test('should validate required fields in contact form', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    const contactForm = page.locator('.contact-form');
    if (await contactForm.isVisible()) {
      // Try to submit empty form
      await page.click(testData.selectors.forms.submitButton);
      
      // Should show validation errors
      await expect(page.locator('input[name="name"]:invalid')).toBeVisible();
      await expect(page.locator('input[name="email"]:invalid')).toBeVisible();
      await expect(page.locator('textarea[name="message"]:invalid')).toBeVisible();
      
      // Should show error messages
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('This field is required');
    }
  });
  
  test('should validate email format in contact form', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    const contactForm = page.locator('.contact-form');
    if (await contactForm.isVisible()) {
      // Fill form with invalid email
      await page.fill('input[name="name"]', testData.testData.forms.contactForm.name);
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('textarea[name="message"]', testData.testData.forms.contactForm.message);
      
      // Submit form
      await page.click(testData.selectors.forms.submitButton);
      
      // Should show email validation error
      await expect(page.locator('input[name="email"]:invalid')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('Please enter a valid email');
    }
  });
  
  test('should submit registration form successfully', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Check if registration form exists
    const registrationForm = page.locator('.registration-form');
    if (await registrationForm.isVisible()) {
      // Fill registration form
      await page.fill('input[name="firstName"]', testData.testData.forms.registrationForm.firstName);
      await page.fill('input[name="lastName"]', testData.testData.forms.registrationForm.lastName);
      await page.fill('input[name="email"]', testData.testData.forms.registrationForm.email);
      await page.fill('input[name="password"]', testData.testData.forms.registrationForm.password);
      await page.fill('input[name="confirmPassword"]', testData.testData.forms.registrationForm.confirmPassword);
      
      // Submit form
      await page.click(testData.selectors.forms.submitButton);
      
      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
      await expect(page.locator('.success-message')).toContainText('Registration successful');
      
      // Should redirect to login page
      await page.waitForURL('**/login');
      await expect(page).toHaveURL(/login/);
    }
  });
  
  test('should validate password confirmation in registration form', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    const registrationForm = page.locator('.registration-form');
    if (await registrationForm.isVisible()) {
      // Fill form with mismatched passwords
      await page.fill('input[name="firstName"]', testData.testData.forms.registrationForm.firstName);
      await page.fill('input[name="lastName"]', testData.testData.forms.registrationForm.lastName);
      await page.fill('input[name="email"]', testData.testData.forms.registrationForm.email);
      await page.fill('input[name="password"]', testData.testData.forms.registrationForm.password);
      await page.fill('input[name="confirmPassword"]', 'different-password');
      
      // Submit form
      await page.click(testData.selectors.forms.submitButton);
      
      // Should show password mismatch error
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('Passwords do not match');
    }
  });
  
  test('should validate password strength in registration form', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    const registrationForm = page.locator('.registration-form');
    if (await registrationForm.isVisible()) {
      // Fill form with weak password
      await page.fill('input[name="firstName"]', testData.testData.forms.registrationForm.firstName);
      await page.fill('input[name="lastName"]', testData.testData.forms.registrationForm.lastName);
      await page.fill('input[name="email"]', testData.testData.forms.registrationForm.email);
      await page.fill('input[name="password"]', '123');
      await page.fill('input[name="confirmPassword"]', '123');
      
      // Submit form
      await page.click(testData.selectors.forms.submitButton);
      
      // Should show password strength error
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('Password must be at least 8 characters');
    }
  });
  
  test('should handle form submission errors gracefully', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    const contactForm = page.locator('.contact-form');
    if (await contactForm.isVisible()) {
      // Mock API error
      await page.route('**/api/contact', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      // Fill and submit form
      await page.fill('input[name="name"]', testData.testData.forms.contactForm.name);
      await page.fill('input[name="email"]', testData.testData.forms.contactForm.email);
      await page.fill('textarea[name="message"]', testData.testData.forms.contactForm.message);
      await page.click(testData.selectors.forms.submitButton);
      
      // Should show error message
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('An error occurred');
      
      // Should show retry button
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    }
  });
  
  test('should handle network timeout in form submission', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    const contactForm = page.locator('.contact-form');
    if (await contactForm.isVisible()) {
      // Mock slow response
      await page.route('**/api/contact', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }, 10000); // 10 second delay
      });
      
      // Fill and submit form
      await page.fill('input[name="name"]', testData.testData.forms.contactForm.name);
      await page.fill('input[name="email"]', testData.testData.forms.contactForm.email);
      await page.fill('textarea[name="message"]', testData.testData.forms.contactForm.message);
      await page.click(testData.selectors.forms.submitButton);
      
      // Should show loading state
      await expect(page.locator('.loading-spinner')).toBeVisible();
      await expect(testData.selectors.forms.submitButton).toBeDisabled();
    }
  });
  
  test('should prevent double form submission', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    const contactForm = page.locator('.contact-form');
    if (await contactForm.isVisible()) {
      // Fill form
      await page.fill('input[name="name"]', testData.testData.forms.contactForm.name);
      await page.fill('input[name="email"]', testData.testData.forms.contactForm.email);
      await page.fill('textarea[name="message"]', testData.testData.forms.contactForm.message);
      
      // Submit form multiple times quickly
      await page.click(testData.selectors.forms.submitButton);
      await page.click(testData.selectors.forms.submitButton);
      await page.click(testData.selectors.forms.submitButton);
      
      // Should only process one submission
      await expect(page.locator('.success-message')).toHaveCount(1);
      
      // Submit button should be disabled during submission
      await expect(testData.selectors.forms.submitButton).toBeDisabled();
    }
  });
  
  test('should handle form cancellation', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    const contactForm = page.locator('.contact-form');
    if (await contactForm.isVisible()) {
      // Fill form partially
      await page.fill('input[name="name"]', testData.testData.forms.contactForm.name);
      await page.fill('input[name="email"]', testData.testData.forms.contactForm.email);
      
      // Click cancel button
      await page.click(testData.selectors.forms.cancelButton);
      
      // Should show confirmation dialog
      await expect(page.locator('.confirmation-dialog')).toBeVisible();
      await expect(page.locator('.confirmation-dialog')).toContainText('Are you sure?');
      
      // Confirm cancellation
      await page.click('.confirmation-dialog button:has-text("Yes")');
      
      // Form should be reset
      await expect(page.locator('input[name="name"]')).toHaveValue('');
      await expect(page.locator('input[name="email"]')).toHaveValue('');
    }
  });
  
  test('should be accessible with keyboard navigation', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
    
    const contactForm = page.locator('.contact-form');
    if (await contactForm.isVisible()) {
      // Navigate through form fields with Tab key
      await page.keyboard.press('Tab'); // Focus first field
      await page.keyboard.type(testData.testData.forms.contactForm.name);
      
      await page.keyboard.press('Tab'); // Focus next field
      await page.keyboard.type(testData.testData.forms.contactForm.email);
      
      await page.keyboard.press('Tab'); // Focus message field
      await page.keyboard.type(testData.testData.forms.contactForm.message);
      
      await page.keyboard.press('Tab'); // Focus submit button
      await page.keyboard.press('Enter'); // Submit form
      
      // Should show success message
      await expect(page.locator('.success-message')).toBeVisible();
    }
  });
});

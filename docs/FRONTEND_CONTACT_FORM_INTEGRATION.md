# 📧 Contact Form - Frontend Integration Guide

This guide explains how to integrate the contact form API into your frontend application.

## 📋 Overview

The contact form allows users to send messages to your business email via AWS SES. Messages are formatted as beautiful HTML emails and delivered to your configured email address.

## 🔗 API Endpoint

**Base URL:** `https://your-api-domain.com` (or your API URL)
**Endpoint:** `POST /api/v1/contact`

## 📥 Request Format

### Headers
```http
Content-Type: application/json
```

### Request Body

All fields are **required**:

| Field | Type | Min Length | Max Length | Description |
|-------|------|------------|------------|-------------|
| `name` | string | 2 | 100 | Sender's full name |
| `email` | string | - | - | Valid email address |
| `phone` | string | 10 | 20 | Phone number |
| `subject` | string | 3 | 200 | Message subject |
| `message` | string | 10 | 2000 | Message content |

### Request Example

```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "phone": "05551234567",
  "subject": "Destek Talebi",
  "message": "Merhaba, randevu sisteminiz hakkında bilgi almak istiyorum."
}
```

## ✅ Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.",
  "data": {
    "messageId": "0100018e-1234-4567-abcd-123456789012-000000"
  }
}
```

## ❌ Error Responses

### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "message": "Geçersiz form verisi",
  "error": {
    "details": [
      {
        "field": "email",
        "message": "Geçerli bir e-posta adresi giriniz"
      }
    ]
  }
}
```

### 429 Too Many Requests - Rate Limit Exceeded
```json
{
  "success": false,
  "message": "Çok fazla istek gönderdiniz. Lütfen birkaç dakika sonra tekrar deneyin."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Mesaj gönderilemedi"
}
```

## 🚦 Rate Limiting

- **Limit:** 5 requests per user
- **Window:** 15 minutes
- **Action:** Show friendly message, disable form for 15 minutes

## 💻 Frontend Implementation Examples

### React/TypeScript Example

```typescript
interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
  data?: {
    messageId: string;
  };
  error?: {
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const submitContactForm = async (
  data: ContactFormData
): Promise<ContactResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result: ContactResponse = await response.json();

    if (response.status === 429) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    return result;
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      throw new Error('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
    }
    throw error;
  }
};

// Usage in component
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState(false);

const handleSubmit = async (formData: ContactFormData) => {
  setLoading(true);
  setError(null);
  
  try {
    const result = await submitContactForm(formData);
    
    if (result.success) {
      setSuccess(true);
      // Reset form
      console.log('Message sent! ID:', result.data?.messageId);
    }
  } catch (err) {
    if (err.message === 'RATE_LIMIT_EXCEEDED') {
      setError('Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.');
    } else {
      setError(err.message || 'Mesaj gönderilirken bir hata oluştu.');
    }
  } finally {
    setLoading(false);
  }
};
```

### React Form Example with Validation

```tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const ContactForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.status === 429) {
        setError('Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.');
        return;
      }

      if (result.success) {
        setSuccess(true);
        reset();
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(result.message || 'Mesaj gönderilemedi');
      }
    } catch (err) {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Name Field */}
      <div>
        <input
          {...register('name', {
            required: 'Ad soyad gereklidir',
            minLength: { value: 2, message: 'Ad en az 2 karakter olmalıdır' },
            maxLength: { value: 100, message: 'Ad en fazla 100 karakter olabilir' }
          })}
          placeholder="Ad Soyad"
          disabled={loading}
        />
        {errors.name && <span>{errors.name.message}</span>}
      </div>

      {/* Email Field */}
      <div>
        <input
          {...register('email', {
            required: 'E-posta gereklidir',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Geçerli bir e-posta adresi giriniz'
            }
          })}
          type="email"
          placeholder="E-posta"
          disabled={loading}
        />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      {/* Phone Field */}
      <div>
        <input
          {...register('phone', {
            required: 'Telefon gereklidir',
            minLength: { value: 10, message: 'Geçerli bir telefon numarası giriniz' },
            maxLength: { value: 20, message: 'Telefon numarası çok uzun' }
          })}
          type="tel"
          placeholder="Telefon"
          disabled={loading}
        />
        {errors.phone && <span>{errors.phone.message}</span>}
      </div>

      {/* Subject Field */}
      <div>
        <input
          {...register('subject', {
            required: 'Konu gereklidir',
            minLength: { value: 3, message: 'Konu en az 3 karakter olmalıdır' },
            maxLength: { value: 200, message: 'Konu en fazla 200 karakter olabilir' }
          })}
          placeholder="Konu"
          disabled={loading}
        />
        {errors.subject && <span>{errors.subject.message}</span>}
      </div>

      {/* Message Field */}
      <div>
        <textarea
          {...register('message', {
            required: 'Mesaj gereklidir',
            minLength: { value: 10, message: 'Mesaj en az 10 karakter olmalıdır' },
            maxLength: { value: 2000, message: 'Mesaj en fazla 2000 karakter olabilir' }
          })}
          placeholder="Mesajınız"
          rows={5}
          disabled={loading}
        />
        {errors.message && <span>{errors.message.message}</span>}
      </div>

      {/* Submit Button */}
      <button type="submit" disabled={loading}>
        {loading ? 'Gönderiliyor...' : 'Gönder'}
      </button>

      {/* Success Message */}
      {success && (
        <div className="success-message">
          Mesajınız başarıyla gönderildi!
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </form>
  );
};

export default ContactForm;
```

### Next.js Example with API Route

```typescript
// pages/api/contact.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/v1/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Mesaj gönderilemedi'
    });
  }
}
```

## 📱 Mobile/React Native Example

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://your-api-domain.com';

export const sendContactMessage = async (data: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/v1/contact`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    
    if (error.response?.data) {
      throw new Error(error.response.data.message);
    }
    
    throw error;
  }
};
```

## 🎨 UI/UX Recommendations

### 1. Loading State
- Show spinner/loading indicator while submitting
- Disable all form inputs during submission
- Display "Gönderiliyor..." on submit button

### 2. Success State
- Show success message: "Mesajınız başarıyla gönderildi!"
- Optionally auto-close after 3-5 seconds
- Reset form after successful submission

### 3. Error Handling
- Display specific error messages from API
- For 429 errors: "Çok fazla deneme yaptınız. 15 dakika sonra tekrar deneyin."
- For network errors: "Bağlantı hatası. İnternet bağlantınızı kontrol edin."
- For validation errors: Show errors next to each field

### 4. Rate Limit Handling
```typescript
// Disable form for 15 minutes after rate limit
const [rateLimitCooldown, setRateLimitCooldown] = useState(false);

useEffect(() => {
  if (rateLimitCooldown) {
    const timer = setTimeout(() => {
      setRateLimitCooldown(false);
    }, 15 * 60 * 1000); // 15 minutes
    return () => clearTimeout(timer);
  }
}, [rateLimitCooldown]);
```

### 5. Form Validation Client-Side

Implement these client-side checks:
- **Name:** 2-100 characters, required
- **Email:** Valid email format, required
- **Phone:** 10-20 characters, required
- **Subject:** 3-200 characters, required
- **Message:** 10-2000 characters, required

## 🔒 Security Best Practices

1. **Environment Variables**: Store API URL in `.env` file
2. **CORS**: Ensure your frontend domain is whitelisted in backend
3. **Rate Limiting**: Implement client-side cooldown after rate limit
4. **Input Sanitization**: Consider sanitizing input (backend does this too)
5. **HTTPS**: Always use HTTPS in production

## 🧪 Testing Checklist

- [ ] Valid form submission works
- [ ] Error messages display correctly
- [ ] Rate limiting is handled (try submitting 6 times)
- [ ] Network errors are caught and displayed
- [ ] Loading states work properly
- [ ] Form resets after successful submission
- [ ] All validation rules are enforced
- [ ] Mobile responsive design works
- [ ] Success message displays correctly

## 📧 Email Delivery

When a contact form is submitted, an email is sent to your configured AWS SES email address with:
- Beautiful HTML formatting
- All form data (name, email, phone, subject, message)
- Reply-to set to sender's email
- Turkish interface

## 🆘 Troubleshooting

### Issue: Network Error
**Solution:** Check API URL in `.env` file

### Issue: CORS Error
**Solution:** Add your frontend domain to backend CORS whitelist

### Issue: 429 Too Many Requests
**Solution:** Wait 15 minutes or implement proper rate limit handling

### Issue: 500 Internal Server Error
**Solution:** Check AWS SES configuration in backend environment variables

## 📚 Related Documentation

- [Contact Form Email Setup](./CONTACT_FORM_EMAIL_SETUP.md)
- [API Documentation](./API.md)
- [Error Handling Guide](./ERROR_HANDLING.md)


















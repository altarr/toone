'use client';

import { useState } from 'react';

interface Field {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface RegistrationFormProps {
  fields: Field[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
  pageTitle: string;
}

export default function RegistrationForm({ fields, onSubmit, pageTitle }: RegistrationFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    for (const field of fields) {
      if (field.required && !values[field.id]?.trim()) {
        setError(`${field.label} is required`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card w-full max-w-md mx-auto">
      <div className="flex justify-center mb-8">
        <a href="/admin/login">
          <img src="/art/TrendAI-Logo-White-RGB.png" alt="TrendAI" className="h-10" />
        </a>
      </div>
      <h1 className="text-xl font-bold text-center mb-2 tracking-wide uppercase text-foreground">
        {pageTitle}
      </h1>
      <p className="text-sm text-muted text-center mb-8">
        Register to join the live broadcast
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="field-label">
              {field.label}
              {field.required && <span className="text-red ml-1">*</span>}
            </label>
            {field.type === 'select' && field.options ? (
              <select
                className="input"
                value={values[field.id] || ''}
                onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
              >
                <option value="">Select...</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-red"
                  checked={values[field.id] === 'true'}
                  onChange={(e) =>
                    setValues({ ...values, [field.id]: e.target.checked ? 'true' : 'false' })
                  }
                />
                {field.label}
              </label>
            ) : (
              <input
                type={field.type || 'text'}
                className="input"
                placeholder={field.label}
                value={values[field.id] || ''}
                onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
              />
            )}
          </div>
        ))}

        {error && <p className="text-error text-sm">{error}</p>}

        <button type="submit" className="btn-gradient mt-2" disabled={submitting}>
          {submitting ? 'Registering...' : 'Join Broadcast'}
        </button>
      </form>
    </div>
  );
}

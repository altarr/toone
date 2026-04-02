'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface Field {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export default function SettingsPage() {
  const router = useRouter();
  const [pageTitle, setPageTitle] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [languages, setLanguages] = useState<{ code: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!getUser()) {
      router.push('/admin/login');
      return;
    }

    apiFetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.page_title) setPageTitle(data.page_title);
        if (data.registration_fields) setFields(data.registration_fields);
        if (data.languages) setLanguages(data.languages);
      });
  }, [router]);

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ key: 'page_title', value: pageTitle }),
      });
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ key: 'registration_fields', value: fields }),
      });
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ key: 'languages', value: languages }),
      });
      setMessage('Settings saved');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      { id: `field_${Date.now()}`, label: '', type: 'text', required: false },
    ]);
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFields(updated);
  };

  return (
    <div className="flex-1 flex flex-col items-center p-5 pt-10">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/admin')} className="text-muted hover:text-foreground text-sm">
            &larr; Back
          </button>
          <h1 className="text-lg font-bold uppercase tracking-wider">Settings</h1>
        </div>

        {/* Page Title */}
        <div className="card mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-red mb-4">Page Title</h2>
          <label className="field-label">Listener page title</label>
          <input
            type="text"
            className="input"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            placeholder="TrendAI Tune In"
          />
        </div>

        {/* Registration Fields */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-red">
              Registration Fields
            </h2>
            <button onClick={addField} className="btn-gradient text-xs py-2 px-4">
              Add Field
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {fields.map((field, i) => (
              <div key={field.id} className="flex gap-3 items-start p-4 rounded-lg bg-input-bg border border-input-border">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveField(i, -1)}
                    className="text-muted hover:text-foreground text-xs"
                    disabled={i === 0}
                  >
                    &#9650;
                  </button>
                  <button
                    onClick={() => moveField(i, 1)}
                    className="text-muted hover:text-foreground text-xs"
                    disabled={i === fields.length - 1}
                  >
                    &#9660;
                  </button>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="field-label">Label</label>
                    <input
                      type="text"
                      className="input"
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      placeholder="Field name"
                    />
                  </div>
                  <div>
                    <label className="field-label">Type</label>
                    <select
                      className="input"
                      value={field.type}
                      onChange={(e) => updateField(i, { type: e.target.value })}
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="select">Dropdown</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-red"
                        checked={field.required}
                        onChange={(e) => updateField(i, { required: e.target.checked })}
                      />
                      Required
                    </label>
                    <button
                      onClick={() => removeField(i)}
                      className="text-error hover:text-red text-xs font-bold ml-auto"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-red">
              Translation Languages
            </h2>
            <button
              onClick={() => setLanguages([...languages, { code: '', name: '' }])}
              className="btn-gradient text-xs py-2 px-4"
            >
              Add Language
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {languages.map((lang, i) => (
              <div key={i} className="flex gap-3 items-end p-3 rounded-lg bg-input-bg border border-input-border">
                <div className="flex-1">
                  <label className="field-label">Code</label>
                  <input
                    type="text"
                    className="input"
                    value={lang.code}
                    onChange={(e) => {
                      const updated = [...languages];
                      updated[i] = { ...updated[i], code: e.target.value.toLowerCase() };
                      setLanguages(updated);
                    }}
                    placeholder="es"
                    maxLength={5}
                  />
                </div>
                <div className="flex-[2]">
                  <label className="field-label">Display Name</label>
                  <input
                    type="text"
                    className="input"
                    value={lang.name}
                    onChange={(e) => {
                      const updated = [...languages];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setLanguages(updated);
                    }}
                    placeholder="Spanish"
                  />
                </div>
                <button
                  onClick={() => setLanguages(languages.filter((_, j) => j !== i))}
                  className="text-error hover:text-red text-xs font-bold pb-3"
                >
                  Remove
                </button>
              </div>
            ))}
            {languages.length === 0 && (
              <p className="text-xs text-muted">No languages configured. Add languages to enable translation channels.</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={saveSettings} className="btn-gradient" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {message && (
            <span className={`text-sm ${message.includes('Failed') ? 'text-error' : 'text-green-500'}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

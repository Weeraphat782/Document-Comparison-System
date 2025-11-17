'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { COMMON_EXTRACTION_FIELDS } from '@/lib/types';

export default function NewRulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [extractionFields, setExtractionFields] = useState<string[]>([]);
  const [comparisonInstructions, setComparisonInstructions] = useState('');
  const [criticalChecks, setCriticalChecks] = useState<string[]>([]);
  const [newField, setNewField] = useState('');
  const [newCheck, setNewCheck] = useState('');

  function addField() {
    if (newField.trim() && !extractionFields.includes(newField.trim())) {
      setExtractionFields([...extractionFields, newField.trim()]);
      setNewField('');
    }
  }

  function removeField(index: number) {
    setExtractionFields(extractionFields.filter((_, i) => i !== index));
  }

  function addCheck() {
    if (newCheck.trim()) {
      setCriticalChecks([...criticalChecks, newCheck.trim()]);
      setNewCheck('');
    }
  }

  function removeCheck(index: number) {
    setCriticalChecks(criticalChecks.filter((_, i) => i !== index));
  }

  function addSuggestedField(field: string) {
    if (!extractionFields.includes(field)) {
      setExtractionFields([...extractionFields, field]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !comparisonInstructions.trim()) {
      alert('Name and comparison instructions are required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          extraction_fields: extractionFields,
          comparison_instructions: comparisonInstructions.trim(),
          critical_checks: criticalChecks,
        }),
      });

      if (response.ok) {
        router.push('/rules?created=true');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create rule');
      }
    } catch (err) {
      console.error('Error creating rule:', err);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/rules">
        <Button variant="ghost" className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Rules
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Rule</h1>
        <p className="text-muted-foreground">
          Define how documents should be compared and verified
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Contract Verification Rule"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this rule checks"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Extraction Fields</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fields to extract from documents (e.g., party_a, amount, date)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addField())}
                placeholder="Field name (e.g., party_a_name)"
              />
              <Button type="button" onClick={addField}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Suggested Fields:</Label>
              <div className="flex flex-wrap gap-1">
                {COMMON_EXTRACTION_FIELDS.map((field) => (
                  <Button
                    key={field}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSuggestedField(field)}
                    disabled={extractionFields.includes(field)}
                    className="text-xs h-6"
                  >
                    {field}
                  </Button>
                ))}
              </div>
            </div>

            {extractionFields.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {extractionFields.map((field, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded"
                  >
                    <span className="text-sm">{field}</span>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparison Instructions *</CardTitle>
            <p className="text-sm text-muted-foreground">
              Detailed instructions for AI on how to compare documents
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={comparisonInstructions}
              onChange={(e) => setComparisonInstructions(e.target.value)}
              placeholder={`You are performing a comprehensive document verification.

ALL DOCUMENTS AND THEIR EXTRACTED DATA:
{allDocuments}

YOUR TASK:
Compare all documents and identify discrepancies...

OUTPUT FORMAT - CRITICAL: You MUST create a separate section for EACH document:

## {documentName}

### ❌ Critical Issues - Must Fix
- Mismatch examples...

### ⚠️ Warnings & Recommendations
- Warning examples...`}
              rows={15}
              required
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Critical Checks</CardTitle>
            <p className="text-sm text-muted-foreground">
              List of critical items that must be verified
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCheck}
                onChange={(e) => setNewCheck(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCheck())}
                placeholder="e.g., Party names must match across all documents"
              />
              <Button type="button" onClick={addCheck}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {criticalChecks.length > 0 && (
              <ul className="space-y-2">
                {criticalChecks.map((check, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 bg-red-50 text-red-900 p-3 rounded"
                  >
                    <span className="text-red-500 mt-0.5">•</span>
                    <span className="flex-1 text-sm">{check}</span>
                    <button
                      type="button"
                      onClick={() => removeCheck(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Rule'
            )}
          </Button>
          <Link href="/rules">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

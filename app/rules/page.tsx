'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, FileText, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { ComparisonRule } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function RulesPage() {
  const [rules, setRules] = useState<ComparisonRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user) {
      loadRules();
    }
  }, [user]);

  // Check for success messages from URL params
  useEffect(() => {
    if (searchParams.get('updated')) {
      toast.success("Rule updated successfully");
      // Remove the param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('updated');
      window.history.replaceState({}, '', url);
    } else if (searchParams.get('created')) {
      toast.success("Rule created successfully");
      // Remove the param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('created');
      window.history.replaceState({}, '', url);
    }
  }, [searchParams]);

  // Refresh data when component becomes visible (e.g., after navigating back from edit)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadRules();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  async function loadRules() {
    try {
      setLoading(true);

      const response = await fetch('/api/rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      } else {
        setError('Failed to load rules');
      }
    } catch (err) {
      console.error('Error loading rules:', err);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, isDefault: boolean) {
    if (isDefault) {
      toast.error("Cannot delete default rule");
      return;
    }

    const ruleToDelete = rules.find(r => r.id === id);
    const confirmed = confirm(
      `Are you sure you want to delete "${ruleToDelete?.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/rules/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRules(rules.filter(r => r.id !== id));
        toast.success(`Rule "${ruleToDelete?.name}" deleted successfully`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete rule');
      }
    } catch (err) {
      console.error('Error deleting rule:', err);
      toast.error('An error occurred while deleting the rule');
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Comparison Rules</h1>
          <p className="text-muted-foreground">
            Manage rules for document comparison and verification
          </p>
        </div>
        <Link href="/rules/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Rule
          </Button>
        </Link>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No rules yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first comparison rule to get started
              </p>
              <Link href="/rules/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{rule.name}</CardTitle>
                      {rule.is_default && (
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Default
                        </Badge>
                      )}
                    </div>
                    {rule.description && (
                      <CardDescription className="mt-2">
                        {rule.description}
                      </CardDescription>
                    )}
                    {rule.document_types && rule.document_types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.document_types.slice(0, 3).map((type, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                        {rule.document_types.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{rule.document_types.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/rules/${rule.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    {!rule.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(rule.id, rule.is_default)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Extraction Fields ({rule.extraction_fields?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {rule.extraction_fields?.slice(0, 5).map((field, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs"
                        >
                          {field}
                        </Badge>
                      ))}
                      {(rule.extraction_fields?.length || 0) > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{(rule.extraction_fields?.length || 0) - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Critical Checks ({rule.critical_checks?.length || 0})
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {rule.critical_checks?.slice(0, 3).map((check, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{check}</span>
                        </li>
                      ))}
                      {(rule.critical_checks?.length || 0) > 3 && (
                        <li className="text-xs text-muted-foreground italic">
                          +{(rule.critical_checks?.length || 0) - 3} more checks
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

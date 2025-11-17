"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { FolderPlus, Folder, Edit, Trash2, FileText, Plus } from "lucide-react"
import { DocumentGroup, DocumentGroupForm } from "@/lib/types"
import { toast } from "sonner"

interface DocumentGroupManagerProps {
  selectedGroupId?: string
  onGroupSelect: (groupId: string) => void
}

export function DocumentGroupManager({ selectedGroupId, onGroupSelect }: DocumentGroupManagerProps) {
  const [groups, setGroups] = useState<DocumentGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<DocumentGroup | null>(null)
  const [formData, setFormData] = useState<DocumentGroupForm>({
    name: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    try {
      const response = await fetch('/api/document-groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data.groups || [])
      } else {
        throw new Error('Failed to load groups')
      }
    } catch (error) {
      console.error('Error loading groups:', error)
      toast.error('Failed to load document groups')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateGroup() {
    if (!formData.name.trim()) {
      toast.error('Group name is required')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/document-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setGroups(prev => [data.group, ...prev])
        setFormData({ name: '', description: '' })
        setCreateDialogOpen(false)
        toast.success('Document group created successfully')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create group')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateGroup() {
    if (!editingGroup || !formData.name.trim()) {
      toast.error('Group name is required')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/document-groups/${editingGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setGroups(prev => prev.map(g => g.id === editingGroup.id ? data.group : g))
        setEditingGroup(null)
        setFormData({ name: '', description: '' })
        toast.success('Document group updated successfully')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update group')
      }
    } catch (error) {
      console.error('Error updating group:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update group')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteGroup(groupId: string) {
    console.log('[DocumentGroupManager] Starting delete for group:', groupId)
    
    try {
      const response = await fetch(`/api/document-groups/${groupId}`, {
        method: 'DELETE'
      })

      console.log('[DocumentGroupManager] Delete response status:', response.status)

      if (response.ok) {
        console.log('[DocumentGroupManager] Delete successful, updating UI')
        
        // Update UI immediately
        setGroups(prev => {
          const newGroups = prev.filter(g => g.id !== groupId)
          console.log('[DocumentGroupManager] Groups before:', prev.length, 'after:', newGroups.length)
          return newGroups
        })
        
        // Clear selection if deleting selected group
        if (selectedGroupId === groupId) {
          console.log('[DocumentGroupManager] Clearing selected group')
          onGroupSelect('')
        }
        
        toast.success('Document group deleted successfully')
      } else {
        const error = await response.json()
        console.error('[DocumentGroupManager] Delete failed:', error)
        throw new Error(error.error || 'Failed to delete group')
      }
    } catch (error) {
      console.error('[DocumentGroupManager] Error deleting group:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete group')
    }
  }

  function openEditDialog(group: DocumentGroup) {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || ''
    })
  }

  function closeDialogs() {
    setCreateDialogOpen(false)
    setEditingGroup(null)
    setFormData({ name: '', description: '' })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document groups...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Document Groups</h3>
          <p className="text-sm text-muted-foreground">
            Organize your documents into groups for analysis
          </p>
        </div>

        <Dialog open={createDialogOpen || !!editingGroup} onOpenChange={(open) => !open && closeDialogs()}>
          <DialogTrigger asChild>
            <Button onClick={() => setCreateDialogOpen(true)} data-tour="create-group">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Edit Document Group' : 'Create New Document Group'}
              </DialogTitle>
              <DialogDescription>
                {editingGroup
                  ? 'Update the document group details.'
                  : 'Create a new group to organize your documents for analysis.'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Contract Review 2024"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this group..."
                  rows={3}
                  disabled={submitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialogs} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                disabled={submitting || !formData.name.trim()}
              >
                {submitting ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Document Groups Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first document group to start uploading and analyzing documents.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card
              key={group.id}
              className={`cursor-pointer transition-colors ${
                selectedGroupId === group.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => onGroupSelect(group.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{group.name}</CardTitle>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditDialog(group)
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Document Group</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{group.name}"? This will also delete all documents in this group. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteGroup(group.id)
                            }}
                            className="bg-red-600 text-white hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {group.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {group.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
                  {selectedGroupId === group.id && (
                    <Badge variant="default" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}



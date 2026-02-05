'use client';

/**
 * UserProfileWidget - February 5, 2026
 * 
 * Displays and allows editing of user preferences from memory.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, User, Clock, Edit2, X, Plus } from 'lucide-react';

interface UserProfile {
  user_id: string;
  preferences: Record<string, string | number | boolean>;
  facts: Array<{
    type: string;
    content: string;
    learned_from?: string;
    timestamp?: string;
  }>;
  last_interaction?: string;
  created_at?: string;
}

interface UserProfileWidgetProps {
  userId?: string;
}

export function UserProfileWidget({ userId = 'morgan' }: UserProfileWidgetProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newPreference, setNewPreference] = useState({ key: '', value: '' });

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/memory/user/${userId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setProfile(result.data);
      } else {
        setError(result.error || 'Failed to fetch user profile');
        setProfile({
          user_id: userId,
          preferences: {},
          facts: [],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProfile({
        user_id: userId,
        preferences: {},
        facts: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const handleAddPreference = async () => {
    if (!newPreference.key.trim()) return;
    
    try {
      const response = await fetch(`/api/memory/user/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_preference',
          key: newPreference.key,
          value: newPreference.value,
        }),
      });
      
      if (response.ok) {
        setNewPreference({ key: '', value: '' });
        fetchProfile();
      }
    } catch (err) {
      setError('Failed to add preference');
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </CardTitle>
          <CardDescription>
            {userId}&apos;s preferences and learned facts
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setEditing(!editing)}
          >
            {editing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchProfile} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {/* Last Interaction */}
        {profile?.last_interaction && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last seen: {formatTimeAgo(profile.last_interaction)}</span>
          </div>
        )}

        {/* Preferences */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Preferences</div>
          <div className="flex flex-wrap gap-2">
            {profile?.preferences && Object.keys(profile.preferences).length > 0 ? (
              Object.entries(profile.preferences)
                .filter(([key]) => !key.startsWith('_'))
                .map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                ))
            ) : (
              <span className="text-sm text-muted-foreground">No preferences set</span>
            )}
          </div>
        </div>

        {/* Add Preference (when editing) */}
        {editing && (
          <div className="space-y-2 border-t pt-4">
            <div className="text-sm font-medium">Add Preference</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Key"
                  value={newPreference.key}
                  onChange={(e) => setNewPreference(p => ({ ...p, key: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Value"
                  value={newPreference.value}
                  onChange={(e) => setNewPreference(p => ({ ...p, value: e.target.value }))}
                />
              </div>
              <Button size="sm" onClick={handleAddPreference}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Learned Facts */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Learned Facts</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {profile?.facts && profile.facts.length > 0 ? (
              profile.facts.map((fact, index) => (
                <div key={index} className="text-sm p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{fact.type}</Badge>
                    <span className="text-muted-foreground text-xs">
                      {fact.learned_from || 'conversation'}
                    </span>
                  </div>
                  <div className="mt-1">{fact.content}</div>
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No facts learned yet</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UserProfileWidget;

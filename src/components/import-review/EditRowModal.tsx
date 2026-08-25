import React, { useState } from 'react';
import { ImportRow, importReviewService } from '@/services/importReviewService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditRowModalProps {
  row: ImportRow;
  onClose: () => void;
  onSaved: () => void;
}

export function EditRowModal({ row, onClose, onSaved }: EditRowModalProps) {
  const [formData, setFormData] = useState<Partial<ImportRow>>({
    ClientShotName: row.ClientShotName,
    ShotName: row.ShotName,
    Episode: row.Episode,
    Artist: row.Artist,
    Lead: row.Lead,
    TotalBid: row.TotalBid,
    Complexity: row.Complexity
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await importReviewService.updateImportRow(row.Id, formData);
      toast({ title: 'Saved', description: 'Staging row updated successfully.' });
      onSaved();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error saving', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-sidebar-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-sidebar-border bg-sidebar-accent/30">
          <h2 className="text-xl font-headline text-white">Edit Staging Record</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Shot Name</Label>
              <Input 
                value={formData.ShotName || ''} 
                onChange={e => setFormData({...formData, ShotName: e.target.value})}
                className="bg-sidebar border-sidebar-border text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Client Shot Name</Label>
              <Input 
                value={formData.ClientShotName || ''} 
                onChange={e => setFormData({...formData, ClientShotName: e.target.value})}
                className="bg-sidebar border-sidebar-border text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Episode / Sequence</Label>
              <Input 
                value={formData.Episode || ''} 
                onChange={e => setFormData({...formData, Episode: e.target.value})}
                className="bg-sidebar border-sidebar-border text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Complexity</Label>
              <Input 
                value={formData.Complexity || ''} 
                onChange={e => setFormData({...formData, Complexity: e.target.value})}
                className="bg-sidebar border-sidebar-border text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Total Bid (Hours)</Label>
              <Input 
                type="number"
                value={formData.TotalBid || ''} 
                onChange={e => setFormData({...formData, TotalBid: parseFloat(e.target.value) || 0})}
                className="bg-sidebar border-sidebar-border text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Assigned Artist (Username/Name)</Label>
              <Input 
                value={formData.Artist || ''} 
                onChange={e => setFormData({...formData, Artist: e.target.value})}
                className="bg-sidebar border-sidebar-border text-white"
                placeholder="Leave blank if unknown"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Lead (Username/Name)</Label>
            <Input 
              value={formData.Lead || ''} 
              onChange={e => setFormData({...formData, Lead: e.target.value})}
              className="bg-sidebar border-sidebar-border text-white"
            />
          </div>
        </div>

        <div className="p-6 border-t border-sidebar-border bg-sidebar-accent/10 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="border-sidebar-border">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-crimson shadow-md shadow-crimson/20 text-white font-bold">
            {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

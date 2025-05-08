import React, { useEffect, useState, ChangeEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Trash2, Play } from 'lucide-react';

interface SoundFile {
  name: string;
  publicUrl: string;
}

const SoundManager = ({ onClose }: { onClose: () => void }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [soundList, setSoundList] = useState<SoundFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .storage
        .from('sounds')
        .list('', { limit: 100 });
      if (error) return;

      const list = data.map(f => {
        const { data: urlData } = supabase
          .storage
          .from('sounds')
          .getPublicUrl(f.name);
        return { name: f.name, publicUrl: urlData.publicUrl };
      });
      setSoundList(list);
    }
    load();
  }, []);

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const upload = async () => {
    if (!files) return;
    setLoading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await supabase
        .storage
        .from('sounds')
        .upload(file.name, file, { cacheControl: '3600', upsert: false });
    }
    setFiles(null);
    const { data } = await supabase.storage.from('sounds').list('', { limit: 100 });
    const refreshed = data!.map(f => {
      const { data: urlData } = supabase.storage.from('sounds').getPublicUrl(f.name);
      return { name: f.name, publicUrl: urlData.publicUrl };
    });
    setSoundList(refreshed);
    setLoading(false);
  };

  const remove = async (name: string) => {
    await supabase.storage.from('sounds').remove([name]);
    setSoundList(list => list.filter(s => s.name !== name));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded bg-white p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Manage Sounds</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">✕</button>
        </div>

        <div className="mb-4">
          <input
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFiles}
            className="mb-2"
          />
          <button
            onClick={upload}
            disabled={!files || loading}
            className="flex items-center gap-2 rounded bg-tmechs-forest px-3 py-1 text-white hover:bg-tmechs-forest/90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        <ul className="space-y-2 max-h-64 overflow-auto">
          {soundList.map(s => (
            <li key={s.name} className="flex items-center justify-between">
              <span className="truncate">{s.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => new Audio(s.publicUrl).play()}>
                  <Play className="h-4 w-4" />
                </button>
                <button onClick={() => remove(s.name)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SoundManager;

import { FileInput } from '@mantine/core';
import { useState } from 'react';
import { EventAlertConfig } from '@/components/types';

export const FileLoader = ({ onLoad }: { onLoad: (config: EventAlertConfig) => void }) => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (file: File | null) => {
    setFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const config = JSON.parse(text);
        onLoad(config);
      };
      reader.readAsText(file);
    }
  };

  return <FileInput label="Load Config File" onChange={handleFileChange} />;
};

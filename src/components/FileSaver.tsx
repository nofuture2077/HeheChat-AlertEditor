import { Button } from '@mantine/core';
import { EventAlertConfig } from '@/components/types';

export const FileSaver = ({ config }: { config: EventAlertConfig }) => {
  const handleSave = () => {
    const blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    a.click();
  };

  return <Button onClick={handleSave}>Save Config</Button>;
};

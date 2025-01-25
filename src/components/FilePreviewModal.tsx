import React, { useState } from 'react';
import { Modal, Stack, TextInput, Group, Button, Text } from '@mantine/core';
import { formatFileSize } from './helper';

interface FilePreviewModalProps {
  opened: boolean;
  onClose: () => void;
  onRename: (id: string, newName: string) => boolean;
  file: {
    id: string;
    name: string;
    mime: string;
    type: 'audio' | 'image' | 'video';
    data: string;
  } | null;
}

export function FilePreviewModal({ opened, onClose, onRename, file }: FilePreviewModalProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (file) {
      setFileName(file.name);
    }
  }, [file]);

  const handleRename = () => {
    if (onRename && file && fileName.trim()) {
      setError('');
      const success = onRename(file.id, fileName.trim());
      if (success) {
        setIsRenaming(false);
      } else {
        setError('A file with this name already exists');
      }
    }
  };

  if (!file) return null;

  const fileUrl = `data:${file.mime};base64,${file.data}`;

  return (
    <Modal opened={opened} onClose={onClose} title={`${file.name} (${formatFileSize(Math.ceil(file.data.length * 0.75))})`} size="lg">
      <Stack>
        {file.type === 'image' && (
          <img
            src={fileUrl}
            alt={file.name}
            style={{
              maxWidth: '100%',
              maxHeight: 300,
              objectFit: 'contain',
            }}
          />
        )}
        {file.type === 'audio' && (
          <audio controls style={{ width: '100%' }}>
            <source src={fileUrl} type={file.mime} />
            Your browser does not support the audio element.
          </audio>
      )}
      {file.type === 'video' && (
          <video controls style={{ width: '100%', maxHeight: 300 }}>
            <source src={fileUrl} type={file.mime} />
            Your browser does not support the video element.
          </video>
      )}
        {isRenaming ? (
          <Group mt="md">
            <TextInput
              placeholder="Enter file name"
              value={fileName}
              onChange={(event) => {
                setFileName(event.currentTarget.value);
                setError('');
              }}
              style={{ flex: 1 }}
              error={error}
            />
            <Button onClick={handleRename} color="blue">Save</Button>
            <Button onClick={() => setIsRenaming(false)} variant="subtle">Cancel</Button>
          </Group>
        ) : (
          <Group mt="md" justify="flex-end">
            <Button onClick={() => setIsRenaming(true)} variant="light">Rename</Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}

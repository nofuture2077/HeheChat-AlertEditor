import React, { useState } from 'react';
import { Modal, Stack, TextInput, Group, Button, Text, Center } from '@mantine/core';
import { IconFile } from '@tabler/icons-react';
import { formatFileSize } from './helper';

interface FilePreviewModalProps {
  opened: boolean;
  onClose: () => void;
  onRename: (id: string, newName: string) => boolean;
  file: {
    id: string;
    name: string;
    mime: string;
    type: 'audio' | 'image' | 'video' | 'application/zip';
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
  
  // Determine preview type based on MIME type
  const isAudio = file.mime.startsWith('audio/');
  const isVideo = file.mime.startsWith('video/');
  const isZip = file.mime === 'application/zip';
  const isImage = !isAudio && !isVideo && !isZip; // Default to image for other files

  return (
    <Modal opened={opened} onClose={onClose} title={`${file.name} (${formatFileSize(Math.ceil(file.data.length * 0.75))})`} size="lg">
      <Stack>
        {isImage && (
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
        {isZip && (
          <Center style={{ height: 300 }}>
            <IconFile size={100} />
            <Text size="lg" ml="md">ZIP Archive</Text>
          </Center>
        )}
        {isAudio && (
          <audio controls style={{ width: '100%' }}>
            <source src={fileUrl} type={file.mime} />
            Your browser does not support the audio element.
          </audio>
      )}
      {isVideo && (
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

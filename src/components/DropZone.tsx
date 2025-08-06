import { Group, Text, rem } from '@mantine/core';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { Dropzone, DropzoneProps } from '@mantine/dropzone';
import { formatFileSize } from './helper';
import { useState } from 'react';

export function DropZone(props: {onSelect: (file: File) => void}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  return (
    <Dropzone
      onDrop={(files) => {
        const file = files[0];
        setSelectedFile(file);
        props.onSelect(file);
      }}
      onReject={(files) => console.log('rejected files', files)}
      maxSize={4 * 1024 ** 2}
      accept={["audio/mpeg", "image/webp", "video/webm"]}
      multiple={false}
    >
      <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
        <Dropzone.Accept>
          <IconUpload
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
          />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconPhoto
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
          />
        </Dropzone.Idle>

        <div>
          <Text size="xl" inline>
            Drag file here
          </Text>
          <Text size="sm" c="dimmed" inline mt={7}>
            {selectedFile ? 
              `Selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})` : 
              'File Limit is 4 MB'}
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
}

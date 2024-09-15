import { Group, Text, rem } from '@mantine/core';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { Dropzone, DropzoneProps } from '@mantine/dropzone';

export function DropZone(props: {onSelect: (file: File) => void}) {
  return (
    <Dropzone
      onDrop={(files) => props.onSelect(files[0])}
      onReject={(files) => console.log('rejected files', files)}
      maxSize={2 * 1024 ** 2}
      accept={["audio/mpeg"]}
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
            File Limit is 2 MB
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
}
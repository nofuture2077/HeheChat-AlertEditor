import { useContext, ReactElement, useState } from 'react';
import { AppContext } from '@/ApplicationContext';
import { ActionIcon, NavLink, ScrollArea, Space, Text, TextInput, Modal, Fieldset, Group, Button, Select, NumberInput, Textarea, Stack, SimpleGrid } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Base64File, EventAlert, EventMainType, EventType, EventTypeMapping } from './types'
import { IconTrash, IconPlus, IconSparkles, IconGiftFilled, IconMoneybag, IconUserHeart, IconCoinBitcoinFilled, IconMusic, IconPhoto, IconVideo, IconFile, IconPlant } from '@tabler/icons-react';
import { DropZone } from './DropZone'
import { generateGUID, readFile } from './helper';

export interface NavigationProps {
}

const icons: Record<EventMainType, ReactElement> = {
    'raid': <IconSparkles />,
    'sub': <IconGiftFilled />,
    'subgift': <IconGiftFilled />,
    'subgiftb': <IconGiftFilled />,
    'follow': <IconUserHeart />,
    'cheer': <IconCoinBitcoinFilled />,
    'donation': <IconMoneybag />,
    'channelPointRedemption':  <IconPlant/>
}

const fileTypeIcon: Record<string, ReactElement> = {
    'audio': <IconMusic />,
    'image': <IconPhoto />,
    'video': <IconVideo />,
}


const alertTypes: Record<string, string> = {
    'sub': 'Subscriptions',
    'subgift': "Gift-Subs",
    "subgiftb": "Received Gift Subs",
    "raid": "Raids",
    "follow": "Follows",
    "donation": "Donations",
    "cheer": "Bit-Donations",
    "channelPointRedemption": "Channel Points"
};

export function ConfirmDeleteView(props: {
    title: string;
    close: () => void;
    confirm: () => void;
}) {
    return (
        <Modal key="confirm-delete-view" opened={true} onClose={props.close} withCloseButton={false}>
            <Fieldset legend={props.title}>
                <Group justify="space-around" mt="md">
                    <Button onClick={props.close}>Cancel</Button>
                    <Button variant="filled" color="pink" onClick={props.confirm}>Delete</Button>
                </Group>
            </Fieldset>
        </Modal>);
}

export function AlertView(props: {
    data?: EventAlert,
    type: EventMainType,
    fileRefs: { name: string, id: string, type: 'audio' | 'image' | 'video' }[],
    title: string;
    close: () => void;
    confirm: (date: EventAlert) => void;
}) {
    const config = useContext(AppContext);
    const [id, setId] = useState(props.data?.id || generateGUID());
    const [name, setName] = useState(props.data?.name || "");
    const [ttsText, setTTSText] = useState(props.data?.audio?.tts?.text || "");
    const [headline, setHeadline] = useState(props.data?.visual?.headline|| "");
    const [text, setText] = useState(props.data?.visual?.text || "");
    const [layout, setLayout] = useState(props.data?.visual?.layout || "");
    const [position, setPosition] = useState(props.data?.visual?.position || "");
    const [type, setType] = useState<EventMainType>(props.type);
    const [specType, setSpecType] = useState<'min' | 'exact' | 'matches'>(props.data?.specifier.type || 'min');
    const [specAmount, setSpecAmount] = useState<number>(props.data?.specifier.amount || 0);
    const [specText, setSpecText] = useState<string>(props.data?.specifier.text || '');
    const [specAttribute, setSpecAttribute] = useState<string | undefined>(props.data?.specifier.attribute || '');

    const [jingle, setJingle] = useState<{ name: string, id: string }>({ name: props.fileRefs.find(x => (x.id === props.data?.audio?.jingle) && x.id)?.name || 'id', id: (props.data?.audio?.jingle || "") });
    const [image, setImage] = useState<{ name: string, id: string }>({ name: props.fileRefs.find(x => (x.id === props.data?.visual?.element) && x.id)?.name || 'id', id: (props.data?.visual?.element || "") });
    const [voiceType, setVoiceType] = useState<'ai' | 'google' | 'none'>(props.data?.audio?.tts?.voiceType || 'none');
    const [voice, setVoice] = useState<string>(props.data?.audio?.tts?.voiceSpecifier || '');

    const nummberSpecType = specType === 'min' || specType === 'exact';

    const InfoText = "You can use ${username}, ${usernameTo}, ${amount}, ${amount2} & ${text} variables inside the text.";
    const voiceTypes = config.aiVoices.length ? ['ai', 'google', 'none'] : ['google', 'none'];
    return (
        <Modal key="confirm-delete-view" opened={true} onClose={props.close} withCloseButton={false} size='xl'>
            <Stack gap="sm">
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <Fieldset legend={props.title}>
                        <TextInput label="Id" value={id} readOnly disabled style={{ display: 'none' }}></TextInput>
                        <TextInput label="Name" value={name} onChange={(ev) => setName(ev.target.value)}></TextInput>
                        <Select label="Jingle" data={['none'].concat(props.fileRefs.filter(x => x.type === 'audio').map(x => x.name || ''))} value={jingle?.name} onChange={(value) => setJingle(props.fileRefs.find(x => x.name === value) || { name: 'none', id: '' })} />
                    </Fieldset>

                    <Fieldset legend="Trigger">
                        <Stack>
                            <Select label="Type" data={['min', 'exact', 'matches']} value={specType} onChange={(value) => setSpecType(value as 'min' | 'exact' | 'matches' || specType)} />
                            {nummberSpecType ? <NumberInput label="Amount" value={specAmount} onChange={(val) => setSpecAmount(Number(val))} /> : 
                            <>
                                <Select label="Attribute" value={specAttribute} data={['rewardTitle', 'username']} onChange={(value) => setSpecAttribute(value || undefined)} />
                                <TextInput label="Text" value={specText} onChange={(ev) => setSpecText(ev.target.value)} />
                            </>}
                        </Stack>
                    </Fieldset>

                    <Fieldset legend="Browser Overlay">
                        <Stack>
                            <Select label="Image" data={['none'].concat(props.fileRefs.filter(x => x.type === 'image').map(x => x.name || ''))} value={image?.name} onChange={(value) => setImage(props.fileRefs.find(x => x.name === value) || { name: 'none', id: '' })} />
                            <Textarea autosize minRows={1} maxRows={3} label="Headline" value={headline} onChange={(ev) => setHeadline(ev.target.value)}></Textarea>
                            <Textarea autosize minRows={1} maxRows={3} label="Text" value={text} onChange={(ev) => setText(ev.target.value)}></Textarea>
                            <TextInput label="Layout" value={layout} onChange={(ev) => setLayout(ev.target.value)}></TextInput>
                            <TextInput label="Position" value={position} onChange={(ev) => setPosition(ev.target.value)}></TextInput>
                        </Stack>
                    </Fieldset>

                    <Fieldset legend="TTS">
                        <Stack>
                            <Select label="TTS System" data={voiceTypes} value={voiceType} onChange={(value) => setVoiceType(value as 'ai' | 'google' | 'none' || specType)} />
                            {voiceType === 'ai' ? <Select label="AI Voice" data={config.aiVoices.map(v => v.name)} value={voice} onChange={(value) => setVoice(value || '')} /> : voiceType === 'google' ? <TextInput label="Voice" value={voice} onChange={(v) => setVoice(v.target.value)}></TextInput> : null}
                            {voiceType === 'none' ? null : (
                                <>
                                    <Textarea autosize minRows={1} maxRows={3} label="TTS Text" value={ttsText} onChange={(ev) => setTTSText(ev.target.value)}></Textarea>
                                    <Text fs="italic">{InfoText}</Text>
                                </>
                            )}
                        </Stack>
                    </Fieldset>

                </SimpleGrid>
                <Group justify="space-around" mt="md">
                    <Button onClick={props.close}>Cancel</Button>
                    <Button variant="filled" color="pink" onClick={() => props.confirm({ id, name, type, specifier: { type: specType, amount: nummberSpecType ? specAmount : undefined, text: nummberSpecType ? undefined : specText, attribute: nummberSpecType ? undefined : specAttribute }, restriction: 'none', visual: headline ? {headline, text, position, layout, element: image?.id || undefined} : undefined, audio: { jingle: jingle?.id || undefined, tts: (ttsText && voiceType !== 'none') ? { text: ttsText, voiceType, voiceSpecifier: voice, voiceParams: {} } : undefined } })}>Create Alert</Button>
                </Group>
            </Stack>
        </Modal>);
}


export function UploadFileView(props: {
    title: string;
    close: () => void;
    confirm: (date: Base64File) => void;
}) {
    const [id] = useState(generateGUID());
    const [name, setName] = useState("");
    const [mime, setMime] = useState("");
    const [data, setData] = useState("");
    const [type, setType] = useState<'audio' | 'image'>('audio');

    const onSelect = function (file: File) {
        setName(file.name);
        setMime(file.type);
        setType(file.type.startsWith('audio') ? 'audio' : 'image');
        readFile(file).then((data: string) => {
            setData(data.split(',')[1]);
        })
    }
    return (
        <Modal key="confirm-delete-view" opened={true} onClose={props.close} withCloseButton={false}>
            <Fieldset legend={props.title}>
                <DropZone onSelect={onSelect}></DropZone>
                <TextInput label="Id" value={id} readOnly disabled></TextInput>
                <TextInput label="Type" value={mime} readOnly disabled></TextInput>
                <TextInput label="Name" value={name} onChange={(ev) => setName(ev.target.value)}></TextInput>
                <Group justify="space-around" mt="md">
                    <Button onClick={props.close}>Cancel</Button>
                    <Button variant="filled" color="pink" onClick={() => props.confirm({ id, name, mime, type, data })}>Upload</Button>
                </Group>
            </Fieldset>
        </Modal>);
}


export function Navigation(props: NavigationProps) {
    const appContext = useContext(AppContext);
    const [confirmDeleteOpen, confirmDeleteHandler] = useDisclosure(false);
    const [confirmDeleteComponent, setConfirmDeleteComponent] = useState<ReactElement | undefined>(undefined);

    const setName = function (name: string) {
        appContext.alertConfig.meta.name = name;
        appContext.setAlertConfig(appContext.alertConfig);
    }

    const deleteFile = function (fileId: string) {
        const config = appContext.alertConfig;
        delete config.data?.files[fileId];
        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    const addAlert = function (data: EventAlert) {
        const config = appContext.alertConfig;
        const array = config.data!.alerts[EventTypeMapping[data.type]];
        const index = array.findIndex(obj => obj.id === data.id);

        if (index !== -1) {
            array[index] = data;
        } else {
            array.push(data);
        }

        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    const addFile = function (data: Base64File) {
        const config = appContext.alertConfig;
        config.data!.files[data.id] = data;
        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    const deleteAlert = function (alertId: string) {
        const config = appContext.alertConfig;
        Object.keys(config.data!.alerts).forEach((evType) => {
            config.data!.alerts[evType as EventMainType] = config.data!.alerts[evType as EventMainType].filter(x => x.id !== alertId);
        });
        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    function confirmDeleteAlert(title: string, confirm: () => void) {
        setConfirmDeleteComponent(<ConfirmDeleteView title={title} close={confirmDeleteHandler.close} confirm={confirm} />);
        confirmDeleteHandler.open();
    }

    function addAlertView(type: EventMainType, title: string, confirm: (data: EventAlert) => void, data?: EventAlert) {
        setConfirmDeleteComponent(<AlertView fileRefs={Object.values(appContext.alertConfig.data?.files || {}).map(x => ({ name: x.name, id: x.id, type: x.type }))} type={type} title={title} data={data} close={confirmDeleteHandler.close} confirm={confirm} />);
        confirmDeleteHandler.open();
    }

    function uploadFileView(title: string, confirm: (data: Base64File) => void) {
        setConfirmDeleteComponent(<UploadFileView title={title} close={confirmDeleteHandler.close} confirm={confirm} />);
        confirmDeleteHandler.open();
    }

    const alertNodes = <>{Object.keys(appContext.alertConfig.data?.alerts || {}).map((ev) => {
        return <NavLink label={alertTypes[ev]} key={ev} leftSection={icons[ev as EventMainType]}>
            {appContext.alertConfig.data!.alerts[ev as EventMainType].map((alert: EventAlert) => <NavLink leftSection={<ActionIcon variant='transparent' onClick={() => addAlertView(ev as EventMainType, 'Edit Alert: ' + alert.name, addAlert, alert)}>{icons[ev as EventMainType]}</ActionIcon>} rightSection={<ActionIcon variant='subtle' onClick={() => confirmDeleteAlert("Are you sure to delete Alert: \"" + alert.name + "\"?", () => deleteAlert(alert.id))}><IconTrash /></ActionIcon>} key={alert.id} label={alert.name} />)}
            <NavLink leftSection={<IconPlus />} label="Add New" key={ev + "-new"} onClick={() => addAlertView(ev as EventMainType, 'Add Alert: ' + alertTypes[ev], addAlert)}></NavLink>
        </NavLink>
    })}</>;

    const fileNodes = <>{Object.values(appContext.alertConfig.data?.files || {}).map((file) => {
        return <NavLink leftSection={fileTypeIcon[file.type]} rightSection={<ActionIcon variant='subtle' onClick={() => confirmDeleteAlert("Are you sure to delete File: \"" + file.name + "\"?", () => deleteFile(file.id))}><IconTrash /></ActionIcon>} key={file.id} label={file.name} />
    })}</>;

    return <ScrollArea>
        {confirmDeleteOpen ? confirmDeleteComponent : null}
        <Text>Meta-Information</Text>
        <TextInput label="Channel" value={appContext.alertConfig.meta.channel} readOnly disabled />
        <TextInput label="Name" value={appContext.alertConfig.meta.name} onChange={(ev) => setName(ev.target.value)} />
        <TextInput label="GUID" value={appContext.alertConfig.meta.guid} readOnly disabled />
        <TextInput label="Hash" value={appContext.alertConfig.meta.hash} readOnly disabled />
        <TextInput label="Last Update" value={appContext.alertConfig.meta.lastUpdate} readOnly disabled />
        <Space h="xl" />
        <Text>Alerts</Text>
        {alertNodes}
        <Space h="xl" />
        <NavLink label={"Files"} key={"files"} leftSection={<IconFile />} defaultOpened>
            {fileNodes}
        </NavLink>
        <NavLink leftSection={<IconPlus />} label="Add New" key={"file-new"} onClick={() => uploadFileView('Upload File', addFile)}></NavLink>

    </ScrollArea>
}
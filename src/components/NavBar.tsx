import { useContext, ReactElement, useState } from 'react';
import { AppContext } from '@/ApplicationContext';
import { ActionIcon, NavLink, ScrollArea, Space, Text, TextInput, Modal, Fieldset, Group, Button, Select, NumberInput} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Base64File, EventAlert, EventMainType, EventType, EventTypeMapping } from './types'
import { IconTrash, IconPlus, IconSparkles, IconGiftFilled, IconMoneybag, IconUserHeart, IconCoinBitcoinFilled, IconMusic, IconPhoto, IconVideo, IconFile } from '@tabler/icons-react';
import { DropZone } from './DropZone'
import { generateGUID, readFile } from './helper';

export interface NavigationProps {
}

const icons: Record<EventMainType, ReactElement> = {
    'raid': <IconSparkles/>,
    'sub': <IconGiftFilled/>,
    'subgift': <IconGiftFilled/>,
    'subgiftb': <IconGiftFilled/>,
    'follow': <IconUserHeart/>,
    'cheer': <IconCoinBitcoinFilled/>,
    'donation': <IconMoneybag/>
}

const fileTypeIcon: Record<string, ReactElement> = {
    'audio': <IconMusic/>,
    'image': <IconPhoto/>,
    'video': <IconVideo/>,
}


const alertTypes: Record<string, string> = {
    'sub': 'Subscriptions',
    'subgift': "Gift-Subs",
    "subgiftb": "Received Gift Subs",
    "raid": "Raids",
    "follow": "Follows",
    "donation": "Donations",
    "cheer": "Bit-Donations"
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
    fileRefs: {name: string, id: string}[],
    title: string;
    close: () => void;
    confirm: (date: EventAlert) => void;
}) {
    const [id, setId] = useState(props.data?.id || generateGUID());
    const [name, setName] = useState(props.data?.name || "");
    const [text, setText] = useState(props.data?.audio?.tts?.text || "");
    const [type, setType] = useState<EventMainType>(props.type);
    const [specType, setSpecType] = useState<'min' | 'exact'>(props.data?.specifier.type || 'min');
    const [specAmount, setSpecAmount] = useState<number>(props.data?.specifier.amount || 0);

    const [jingle, setJingle] = useState<{name: string, id: string}>({name: props.fileRefs.find(x => (x.id === props.data?.audio?.jingle) && x.id)?.name || 'id', id: (props.data?.audio?.jingle || "")});
    const [voiceType, setVoiceType] = useState<'ai' | 'google' | 'none'>(props.data?.audio?.tts?.voiceType || 'none');
    const [voice, setVoice] = useState<string>(props.data?.audio?.tts?.voiceSpecifier || '');

    const InfoText = "You can use {{username}}, {{usernameTo}}, {{amount}}, {{amount2}} & {{text}} variables inside the text.";

    return (
        <Modal key="confirm-delete-view" opened={true} onClose={props.close} withCloseButton={false}>
            <Fieldset legend={props.title}>
                <TextInput label="Id" value={id} readOnly disabled></TextInput>
                <TextInput label="Name" value={name} onChange={(ev) => setName(ev.target.value)}></TextInput>
                
                <Select label="Type" data={['min', 'exact']} value={specType} onChange={(value) => setSpecType(value as 'min' | 'exact' || specType)} />
                <NumberInput label="Amount" value={specAmount} onChange={(val) => setSpecAmount(Number(val))} />

                <Space h="lg"/>

                <Select label="Jingle" data={['-'].concat(props.fileRefs.map(x => x.name || ''))} value={jingle?.name} onChange={(value) => setJingle(props.fileRefs.find(x => x.name === value) || {name: '-', id: ''})} />

                <Space h="lg"/>

                <Select label="TTS System" data={['ai', 'google', 'none']} value={voiceType} onChange={(value) => setVoiceType(value as 'ai' | 'google' | 'none' || specType)} />
                <TextInput label="Voice" value={voice} onChange={(v) => setVoice(v.target.value)}></TextInput>

                <TextInput label="TTS Text" value={text} onChange={(ev) => setText(ev.target.value)}></TextInput>
                <Text fs="italic">{InfoText}</Text>

                <Group justify="space-around" mt="md">
                    <Button onClick={props.close}>Cancel</Button>
                    <Button variant="filled" color="pink" onClick={() => props.confirm({id, name, type, specifier: {type: specType, amount: specAmount}, restriction: 'none', audio: {jingle: jingle?.id || undefined, tts: (text && voiceType !== 'none') ? { text, voiceType, voiceSpecifier: voice, voiceParams: {}} : undefined}})}>Create Alert</Button>
                </Group>
            </Fieldset>
        </Modal>);
}


export function UploadFileView(props: {
    title: string;
    close: () => void;
    confirm: (date: Base64File) => void;
}) {
    const [id, setId] = useState(generateGUID());
    const [name, setName] = useState("");
    const [mime, setMime] = useState("");
    const [data, setData] = useState("");

    const onSelect = function(file: File) {
        setName(file.name);
        setMime(file.type);
        readFile(file).then((data: string) => {
            setData(data);
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
                    <Button variant="filled" color="pink" onClick={() => props.confirm({id, name, mime, type: 'audio', data})}>Upload</Button>
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

    const deleteFile = function(fileId: string) {
        const config = appContext.alertConfig;
        delete config.data?.files[fileId];
        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    const addAlert = function(data: EventAlert) {
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

    const addFile = function(data: Base64File) {
        const config = appContext.alertConfig;
        config.data!.files[data.id] = data;
        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }
    
    const deleteAlert = function(alertId: string) {
        const config = appContext.alertConfig;
        Object.keys(config.data!.alerts).forEach((evType) => {
            config.data!.alerts[evType as EventMainType] = config.data!.alerts[evType as EventMainType].filter(x => x.id !== alertId);
        });
        appContext.setAlertConfig(config);
        confirmDeleteHandler.close();
        setConfirmDeleteComponent(undefined);
    }

    function confirmDeleteAlert(title: string, confirm: () => void) {
        setConfirmDeleteComponent(<ConfirmDeleteView title={title} close={confirmDeleteHandler.close} confirm={confirm}/>);
        confirmDeleteHandler.open();
    }

    function addAlertView(type: EventMainType, title: string, confirm: (data: EventAlert) => void, data?: EventAlert) {
        setConfirmDeleteComponent(<AlertView fileRefs={Object.values(appContext.alertConfig.data?.files || {}).map(x => ({name: x.name, id: x.id}))} type={type} title={title} data={data} close={confirmDeleteHandler.close} confirm={confirm}/>);
        confirmDeleteHandler.open();
    }

    function uploadFileView(title: string, confirm: (data: Base64File) => void) {
        setConfirmDeleteComponent(<UploadFileView title={title} close={confirmDeleteHandler.close} confirm={confirm}/>);
        confirmDeleteHandler.open();
    }
    
    const alertNodes = <>{Object.keys(appContext.alertConfig.data?.alerts || {}).map((ev) => {
        return <NavLink label={alertTypes[ev]} key={ev} leftSection={icons[ev as EventMainType]}>
            {appContext.alertConfig.data!.alerts[ev as EventMainType].map((alert: EventAlert) => <NavLink leftSection={icons[ev as EventMainType]} onClick={() => addAlertView(ev as EventMainType, 'Edit Alert: ' + alert.name, addAlert, alert)} rightSection={<ActionIcon variant='subtle' onClick={() => confirmDeleteAlert("Are you sure to delete Alert: \"" + alert.name + "\"?", () => deleteAlert(alert.id))}><IconTrash/></ActionIcon>} key={alert.id} label={alert.name}/>)}
            <NavLink leftSection={<IconPlus />} label="Add New" key={ev + "-new"} onClick={() => addAlertView(ev as EventMainType, 'Add Alert: ' + alertTypes[ev], addAlert)}></NavLink>
        </NavLink>
    })}</>;

    const fileNodes = <>{Object.values(appContext.alertConfig.data?.files || {}).map((file) => {
        return <NavLink leftSection={fileTypeIcon[file.type]} rightSection={<ActionIcon variant='subtle' onClick={() => confirmDeleteAlert("Are you sure to delete File: \"" + file.name + "\"?", () => deleteFile(file.id))}><IconTrash/></ActionIcon>}  key={file.id} label={file.name}/>
    })}</>;

    return <ScrollArea>
        {confirmDeleteOpen ? confirmDeleteComponent : null}
        <Text>Meta-Information</Text>
        <TextInput label="Channel" value={appContext.alertConfig.meta.channel} readOnly disabled/>
        <TextInput label="Name" value={appContext.alertConfig.meta.name} onChange={(ev) => setName(ev.target.value)}/>
        <TextInput label="GUID" value={appContext.alertConfig.meta.guid} readOnly disabled/>
        <TextInput label="Hash" value={appContext.alertConfig.meta.hash} readOnly disabled/>
        <TextInput label="Last Update" value={appContext.alertConfig.meta.lastUpdate} readOnly disabled/>
        <Space h="xl"/>
        <Text>Alerts</Text>
        {alertNodes}
        <Space h="xl"/>
        <NavLink label={"Files"} key={"files"} leftSection={<IconFile/>} defaultOpened>
            {fileNodes}
        </NavLink>
        <NavLink leftSection={<IconPlus />} label="Add New" key={"file-new"} onClick={() => uploadFileView('Upload File', addFile)}></NavLink>
       
    </ScrollArea>
}
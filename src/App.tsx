import AlertEditor from './components/AlertEditor';
import { createTheme, MantineProvider, virtualColor } from '@mantine/core';
import { AppContext, DefaultAppContext } from './ApplicationContext';
import { useEffect, useState } from 'react';
import { EventAlertConfig } from './components/types';
import { hashObjectSHA256 } from './components/helper'
import { HomePage } from './pages/Home.page'
import { AITTSVoice } from './components/types'
import '@mantine/core/styles.css';

function App() {
    const [appContext, setAppContext] = useState(DefaultAppContext);
    const theme = createTheme({
        colors: {
            primary: virtualColor({
                name: 'primary',
                dark: 'orange',
                light: 'cyan',
            }),
        },
    });

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        return <MantineProvider defaultColorScheme="auto" theme={theme}><HomePage/></MantineProvider>
    }

    useEffect(() => {
        fetch(import.meta.env.VITE_BACKEND_URL + '/event/config/get?token=' + token).then(res => res.json()).then(data => {
            setAppContext((context) => ({...context, alertConfig: data}));
        });

        fetch(import.meta.env.VITE_BACKEND_URL + '/tts/ai/voices?token=' + token).then(res => res.json()).then((data: AITTSVoice[]) => {
            const voices = data.filter(v => v.category === 'cloned').map((v) => ({voice_id: v.voice_id, name: v.name, preview_url: v.preview_url, category: v.category}));
            setAppContext((context) => ({...context, aiVoices: voices}));
        });
    }, []);

    const setAlertConfig = async (alertConfig: EventAlertConfig) => {
        alertConfig.meta.lastUpdate = new Date().toISOString();
        alertConfig.meta.hash = await(hashObjectSHA256(alertConfig.data));
        setAppContext({...appContext, alertConfig });
    };

    const uploadAlertConfig = async function () {
        return fetch(import.meta.env.VITE_BACKEND_URL + '/event/config/set', {
            body: JSON.stringify({token, data: appContext.alertConfig}),
            method: 'POST'
        }).then(res => undefined);
    }

    return <MantineProvider defaultColorScheme="auto" theme={theme}>
            <AppContext.Provider value={{...appContext, setAlertConfig, uploadAlertConfig}}>
                <AlertEditor />
            </AppContext.Provider>
        </MantineProvider>;
}

export default App;
import AlertEditor from './components/AlertEditor';
import { createTheme, MantineProvider, virtualColor } from '@mantine/core';
import { AppContext, DefaultAppContext } from './ApplicationContext';
import { useEffect, useState } from 'react';
import { EventAlertConfig } from './components/types';
import { hashObjectSHA256 } from './components/helper'
import { HomePage } from './pages/Home.page'
import { AITTSVoice, GoogleTTSVoice } from './components/types'
import '@mantine/core/styles/global.css';
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
            setAppContext((context) => ({...context, alertConfig: {...data, data: {...data.data, alerts: {...context.alertConfig.data?.alerts, ...data.data.alerts}}}}));
        });

        fetch(import.meta.env.VITE_BACKEND_URL + "/sink/get?token=" + token).then(res => res.json()).then(data => {
            const sink = data.sink;
            setAppContext((context) => ({...context, sink}));
            
            // Fetch premium status after sink is loaded
            const premiumUrl = `${import.meta.env.VITE_BACKEND_URL}/premium/status?sink=${sink}`;
                
            fetch(premiumUrl)
                .then(res => res.json())
                .then((data: {premium: boolean}) => {
                    setAppContext((context) => ({...context, isPremium: data.premium}));
                })
                .catch(error => {
                    console.error('Failed to fetch premium status:', error);
                    setAppContext((context) => ({...context, isPremium: false}));
                });
        });

        fetch(import.meta.env.VITE_BACKEND_URL + '/tts/ai/voices?token=' + token).then(res => res.json()).then((data: AITTSVoice[]) => {
            const voices = data.map((v) => ({voice_id: v.voice_id, name: v.name, preview_url: v.preview_url, category: v.category}));
            setAppContext((context) => ({...context, aiVoices: voices}));
        });

        fetch(import.meta.env.VITE_BACKEND_URL + '/tts/voices?token=' + token).then(res => res.json()).then((data: {voices: GoogleTTSVoice[]}) => {
            setAppContext((context) => ({...context, googleVoices: data.voices}));
        });
    }, []);

    const setAlertConfig = async (alertConfig: EventAlertConfig) => {
        alertConfig.meta.lastUpdate = new Date().toISOString();
        alertConfig.meta.hash = await(hashObjectSHA256(alertConfig.data));
        setAppContext({...appContext, alertConfig });
    };

    const uploadAlertConfig = async function () {
        // Create a copy of the alert config without files for the meta request
        const metaConfig = JSON.parse(JSON.stringify(appContext.alertConfig));
        if (metaConfig.data && metaConfig.data.files) {
            metaConfig.data.files = {};
        }
        
        // Make both requests
        const mainRequest = fetch(import.meta.env.VITE_BACKEND_URL + '/event/config/set/' + token, {
            body: JSON.stringify(appContext.alertConfig),
            method: 'POST'
        });
        
        const metaRequest = fetch(import.meta.env.VITE_BACKEND_URL + '/event/config/meta/' + token, {
            body: JSON.stringify(metaConfig),
            method: 'POST'
        });
        
        // Wait for both requests to complete
        await Promise.all([mainRequest, metaRequest]);
        return undefined;
    }

    const replayEvent = async function (event: any) {
        event.force = true;
        return fetch(import.meta.env.VITE_BACKEND_URL + '/event/replay?sink=' + appContext.sink, {
            method: 'POST',
            body: JSON.stringify({
                type: 'replayevent',
                data: event
            }),
        });
    }

    return <MantineProvider defaultColorScheme="auto" theme={theme}>
            <AppContext.Provider value={{...appContext, setAlertConfig, uploadAlertConfig, replayEvent, isPremium: appContext.isPremium}}>
                <AlertEditor />
            </AppContext.Provider>
        </MantineProvider>;
}

export default App;

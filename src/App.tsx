import AlertEditor from './components/AlertEditor';
import { createTheme, MantineProvider, virtualColor } from '@mantine/core';
import { AppContext, DefaultAppContext } from './ApplicationContext';
import { useEffect, useState } from 'react';
import { EventAlertConfig } from './components/types';
import { hashObjectSHA256 } from './components/helper'
import '@mantine/core/styles.css';

function App() {
    const [appContext, setAppContext] = useState({...DefaultAppContext});
    const theme = createTheme({
        colors: {
            primary: virtualColor({
                name: 'primary',
                dark: 'orange',
                light: 'cyan',
            }),
        },
    });

    useEffect(() => {
        fetch(import.meta.env.VITE_BACKEND_URL + '/event/config/get?channel=knirpz').then(res => res.json()).then(data => {
            setAppContext({...appContext, alertConfig: data});
        });
    }, []);

    const setAlertConfig = async (alertConfig: EventAlertConfig) => {
        alertConfig.meta.lastUpdate = new Date().toISOString();
        alertConfig.meta.hash = await(hashObjectSHA256(alertConfig.data));
        setAppContext({...appContext, alertConfig });
    };

    const uploadAlertConfig = async function () {
        fetch(import.meta.env.VITE_BACKEND_URL + '/event/config/set?channel=knirpz', {
            body: JSON.stringify(appContext.alertConfig),
            method: 'POST'
        });
    }

    return <MantineProvider defaultColorScheme="auto" theme={theme}>
            <AppContext.Provider value={{...appContext, setAlertConfig, uploadAlertConfig}}>
                <AlertEditor />
            </AppContext.Provider>
        </MantineProvider>;
}

export default App;
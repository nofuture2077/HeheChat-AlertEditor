import AlertEditor from './components/AlertEditor';
import { createTheme, MantineProvider, virtualColor } from '@mantine/core';
import { AppContext, DefaultAppContext } from './ApplicationContext';
import { useEffect, useState } from 'react';
import { EventAlertConfig } from './components/types';
import { hashObjectSHA256 } from './components/helper'
import { HomePage } from './pages/Home.page'
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

    const urlParams = new URLSearchParams(window.location.search);
    const channel = urlParams.get('channel');
    const token = urlParams.get('token');

    if (!channel || !token) {
        return <MantineProvider defaultColorScheme="auto" theme={theme}><HomePage/></MantineProvider>
    }

    useEffect(() => {
        fetch(import.meta.env.VITE_BACKEND_URL + '/event/config/get?channel=' + channel + '&token=' + token).then(res => res.json()).then(data => {
            data.meta.channel = channel;
            setAppContext({...appContext, alertConfig: data});
        });
    }, []);

    const setAlertConfig = async (alertConfig: EventAlertConfig) => {
        alertConfig.meta.lastUpdate = new Date().toISOString();
        alertConfig.meta.hash = await(hashObjectSHA256(alertConfig.data));
        setAppContext({...appContext, alertConfig });
    };

    const uploadAlertConfig = async function () {
        return fetch(import.meta.env.VITE_BACKEND_URL + '/event/config/set', {
            body: JSON.stringify({channel, token, data: appContext.alertConfig}),
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
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme, virtualColor } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import App from './App';

const theme = createTheme({
    colors: {
        primary: virtualColor({
            name: 'primary',
            dark: 'orange',
            light: 'cyan',
        }),
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <MantineProvider defaultColorScheme="auto" theme={theme}>
        <App />
    </MantineProvider>
);

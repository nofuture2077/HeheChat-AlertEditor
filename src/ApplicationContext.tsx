import { createContext } from "react";
import { AITTSVoice, EventAlertConfig, NEW_ALERTCONFIG } from "./components/types";

export interface AppContextProps {
    alertConfig: EventAlertConfig
    setAlertConfig: (alertConfig: EventAlertConfig) => void;
    uploadAlertConfig: () => Promise<void>;
    replayEvent: (event: any) => Promise<Response>;
    sink?: string;
    aiVoices: AITTSVoice[];
}

export const DefaultAppContext: AppContextProps = {
    alertConfig: NEW_ALERTCONFIG,
    setAlertConfig: (alertConfig: EventAlertConfig) => {},
    uploadAlertConfig: () => Promise.resolve(),
    aiVoices: [],
    replayEvent: () => Promise.resolve(new Response())
};

export const AppContext = createContext(DefaultAppContext);

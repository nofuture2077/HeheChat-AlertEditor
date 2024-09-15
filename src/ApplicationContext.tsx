import { createContext } from "react";
import { EventAlertConfig, NEW_ALERTCONFIG } from "./components/types";

export interface AppContextProps {
    alertConfig: EventAlertConfig
    setAlertConfig: (alertConfig: EventAlertConfig) => void;
    uploadAlertConfig: () => Promise<void>;
}

export const DefaultAppContext: AppContextProps = {
    alertConfig: NEW_ALERTCONFIG,
    setAlertConfig: (alertConfig: EventAlertConfig) => {},
    uploadAlertConfig: () => Promise.resolve()
};

export const AppContext = createContext(DefaultAppContext);
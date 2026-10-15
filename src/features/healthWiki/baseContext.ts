import { createContext, useContext } from 'react';

export const BaseContext = createContext('/health-wiki');
export const useHealthWikiBase = () => useContext(BaseContext);

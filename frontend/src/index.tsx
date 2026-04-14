import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import './index.css';
import { I18nProvider } from './i18n';
import { TutorialProvider } from './tutorial/TutorialContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <TutorialProvider>
          <App />
        </TutorialProvider>
      </I18nProvider>
    </Provider>
  </React.StrictMode>
);

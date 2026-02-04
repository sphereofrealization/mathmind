/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIChat from './pages/AIChat';
import Agents from './pages/Agents';
import AssetFinder from './pages/AssetFinder';
import BuyTokens from './pages/BuyTokens';
import ContentViewer from './pages/ContentViewer';
import Dashboard from './pages/Dashboard';
import DocToJSONL from './pages/DocToJSONL';
import Earnings from './pages/Earnings';
import Export from './pages/Export';
import FineTuningBackend from './pages/FineTuningBackend';
import FruitlesBridge from './pages/FruitlesBridge';
import GrowthAgent from './pages/GrowthAgent';
import Invite from './pages/Invite';
import Library from './pages/Library';
import Marketplace from './pages/Marketplace';
import ModelStudio from './pages/ModelStudio';
import MyAssets from './pages/MyAssets';
import SiteManagement from './pages/SiteManagement';
import TrainAI from './pages/TrainAI';
import TrainingMonitor from './pages/TrainingMonitor';
import Upload from './pages/Upload';
import CollabRooms from './pages/CollabRooms';
import Synthesizer from './pages/Synthesizer';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIChat": AIChat,
    "Agents": Agents,
    "AssetFinder": AssetFinder,
    "BuyTokens": BuyTokens,
    "ContentViewer": ContentViewer,
    "Dashboard": Dashboard,
    "DocToJSONL": DocToJSONL,
    "Earnings": Earnings,
    "Export": Export,
    "FineTuningBackend": FineTuningBackend,
    "FruitlesBridge": FruitlesBridge,
    "GrowthAgent": GrowthAgent,
    "Invite": Invite,
    "Library": Library,
    "Marketplace": Marketplace,
    "ModelStudio": ModelStudio,
    "MyAssets": MyAssets,
    "SiteManagement": SiteManagement,
    "TrainAI": TrainAI,
    "TrainingMonitor": TrainingMonitor,
    "Upload": Upload,
    "CollabRooms": CollabRooms,
    "Synthesizer": Synthesizer,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
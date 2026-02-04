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
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Library from './pages/Library';
import ContentViewer from './pages/ContentViewer';
import Export from './pages/Export';
import AIChat from './pages/AIChat';
import TrainAI from './pages/TrainAI';
import TrainingMonitor from './pages/TrainingMonitor';
import MyAssets from './pages/MyAssets';
import Marketplace from './pages/Marketplace';
import Earnings from './pages/Earnings';
import GrowthAgent from './pages/GrowthAgent';
import Invite from './pages/Invite';
import ModelStudio from './pages/ModelStudio';
import FineTuningBackend from './pages/FineTuningBackend';
import SiteManagement from './pages/SiteManagement';
import BuyTokens from './pages/BuyTokens';
import DocToJSONL from './pages/DocToJSONL';
import FruitlesBridge from './pages/FruitlesBridge';
import AssetFinder from './pages/AssetFinder';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Upload": Upload,
    "Library": Library,
    "ContentViewer": ContentViewer,
    "Export": Export,
    "AIChat": AIChat,
    "TrainAI": TrainAI,
    "TrainingMonitor": TrainingMonitor,
    "MyAssets": MyAssets,
    "Marketplace": Marketplace,
    "Earnings": Earnings,
    "GrowthAgent": GrowthAgent,
    "Invite": Invite,
    "ModelStudio": ModelStudio,
    "FineTuningBackend": FineTuningBackend,
    "SiteManagement": SiteManagement,
    "BuyTokens": BuyTokens,
    "DocToJSONL": DocToJSONL,
    "FruitlesBridge": FruitlesBridge,
    "AssetFinder": AssetFinder,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
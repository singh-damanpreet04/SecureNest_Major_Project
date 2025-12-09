import { useState, useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { Sun, Moon, Droplet, Sparkles, Zap, Clock, Leaf, Heart, Flame, Palette } from 'lucide-react';
import { motion } from 'framer-motion';

const ThemeSelector = () => {
    const { preferences, themes, updateThemePreferences, isLoading, setTheme } = useThemeStore();
    
    const [localPrefs, setLocalPrefs] = useState(preferences);

    useEffect(() => {
        setLocalPrefs(preferences);
    }, [preferences]);

    const themeIcons = {
        light: Sun,
        dark: Moon,
        blue: Droplet,
        purple: Sparkles,
        forest: Leaf,
        rose: Heart,
        amber: Flame,
        teal: Droplet,
        slate: Palette,
        mocha: Palette,
        auraIndigo: Sparkles,
        dill: Leaf,
        sunny: Sun,
        verdant: Leaf,
        lavender: Sparkles,
        cherry: Heart,
        cyber: Zap
    };

    const handleSave = () => {
        updateThemePreferences(localPrefs);
    };

    const ThemeCard = ({ themeName, themeData }) => {
        const Icon = themeIcons[themeName] || Sparkles;
        
        return (
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-4 rounded-lg border-2 cursor-pointer transition-all"
                style={{
                    backgroundColor: themeData.bg,
                    borderColor: themeData.accent,
                    color: themeData.text
                }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <Icon size={20} style={{ color: themeData.accent }} />
                    <span className="font-semibold">{themeData.name}</span>
                </div>
                <div className="flex gap-2 mt-2">
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: themeData.bg }}></div>
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: themeData.accent }}></div>
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: themeData.secondary }}></div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-secondary rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-primary flex items-center gap-2">
                <Sparkles className="accent" />
                Theme Customization
            </h2>

            {/* Time-based toggle */}
            <div className="mb-6 p-4 bg-primary rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={localPrefs.timeBased}
                        onChange={(e) => setLocalPrefs({ ...localPrefs, timeBased: e.target.checked })}
                        className="w-5 h-5 accent"
                    />
                    <Clock className="accent" size={20} />
                    <span className="text-primary font-medium">Enable Time-Based Themes</span>
                </label>
                <p className="text-sm text-gray-400 mt-2 ml-8">
                    Automatically switch themes based on time of day
                </p>
            </div>

            {/* Global Theme Selector (shown when time-based is off) */}
            {!localPrefs.timeBased && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-primary">Select Theme</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(themes).map(([key, theme]) => (
                            <div
                                key={key}
                                onClick={() => {
                                    setLocalPrefs({ ...localPrefs, globalTheme: key });
                                    setTheme(key); // immediate preview
                                }}
                                className={localPrefs.globalTheme === key ? 'ring-4 ring-accent rounded-lg' : ''}
                            >
                                <ThemeCard themeName={key} themeData={theme} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Time-based Theme Selectors */}
            {localPrefs.timeBased && (
                <div className="space-y-6">
                    {/* Morning Theme */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                            <Sun size={20} className="accent" />
                            Morning (00:00 - 12:00)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(themes).map(([key, theme]) => (
                                <div
                                    key={key}
                                    onClick={() => {
                                        setLocalPrefs({ ...localPrefs, morningTheme: key });
                                        setTheme(key); // preview selection
                                    }}
                                    className={localPrefs.morningTheme === key ? 'ring-4 ring-accent rounded-lg' : ''}
                                >
                                    <ThemeCard themeName={key} themeData={theme} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Afternoon Theme */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                            <Droplet size={20} className="accent" />
                            Afternoon (12:00 - 18:00)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(themes).map(([key, theme]) => (
                                <div
                                    key={key}
                                    onClick={() => {
                                        setLocalPrefs({ ...localPrefs, afternoonTheme: key });
                                        setTheme(key);
                                    }}
                                    className={localPrefs.afternoonTheme === key ? 'ring-4 ring-accent rounded-lg' : ''}
                                >
                                    <ThemeCard themeName={key} themeData={theme} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Night Theme */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                            <Moon size={20} className="accent" />
                            Night (18:00 - 00:00)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(themes).map(([key, theme]) => (
                                <div
                                    key={key}
                                    onClick={() => {
                                        setLocalPrefs({ ...localPrefs, nightTheme: key });
                                        setTheme(key);
                                    }}
                                    className={localPrefs.nightTheme === key ? 'ring-4 ring-accent rounded-lg' : ''}
                                >
                                    <ThemeCard themeName={key} themeData={theme} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isLoading ? 'Saving...' : 'Save Theme Preferences'}
                </button>
            </div>
        </div>
    );
};

export default ThemeSelector;

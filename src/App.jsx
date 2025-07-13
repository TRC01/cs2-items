import React, { useState, useEffect, useMemo } from 'react';

// --- Helper Components & Icons for a Polished UI ---
const Icon = ({ path, className = "w-6 h-6" }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path} /></svg>;
const SearchIcon = () => <Icon path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />;
const CloseIcon = () => <Icon path="M6 18L18 6M6 6l12 12" />;
const HomeIcon = () => <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />;

// =================================================================================================
// --- Main App Component (The Core of the Application) ---
// =================================================================================================
export default function App() {
  const [view, setView] = useState({ page: 'home' });
  const [data, setData] = useState({ collections: {}, cases: {}, agents: [], stickers: [], graffiti: [], patches: [], musicKits: [], tools: [], keychains: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processData = async () => {
      try {
        // This function safely fetches a JSON file and returns an empty array if it's missing or invalid.
        const safeFetch = async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.warn(`Could not find ${url}, will be treated as an empty category.`);
              return [];
            }
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return response.json();
            } else {
                console.warn(`Response from ${url} was not JSON, skipping.`);
                return [];
            }
          } catch (e) {
            console.error(`Error fetching or parsing ${url}:`, e);
            return [];
          }
        };

        // Fetch all required data files in parallel for maximum speed.
        const [
          allSkins,
          allCrates,
          allCollections,
          allAgents,
          allStickers,
          allPatches,
          allGraffiti,
          allMusicKits,
          allTools,
          allKeychains,
        ] = await Promise.all([
          safeFetch('/api/en/skins.json'),
          safeFetch('/api/en/crates.json'),
          safeFetch('/api/en/collections.json'),
          safeFetch('/api/en/agents.json'),
          safeFetch('/api/en/stickers.json'),
          safeFetch('/api/en/patches.json'),
          safeFetch('/api/en/graffiti.json'),
          safeFetch('/api/en/music_kits.json'),
          safeFetch('/api/en/tools.json'),
          safeFetch('/api/en/keychains.json'),
        ]);

        // --- THE DEFINITIVE LOGIC ---
        // Create a master lookup map for all skins by their ID. This is extremely fast.
        const skinsById = allSkins.reduce((acc, skin) => {
          acc[skin.id] = skin;
          return acc;
        }, {});

        // Step 1: Create a perfect map of all collections and their items.
        const collectionsMap = allCollections.reduce((acc, collection) => {
          if (collection.contains) {
            acc[collection.name] = {
              ...collection,
              items: collection.contains.map(skinRef => skinsById[skinRef.id]).filter(Boolean)
            };
          }
          return acc;
        }, {});

        // Step 2: Create a map of all cases and populate their contents correctly.
        const casesMap = allCrates.reduce((acc, crate) => {
          if (crate.type !== 'Case') return acc;

          const itemPool = new Set();

          // Step 2a: Get weapon skins from the collections the case contains.
          if (crate.contains) {
            crate.contains.forEach(collectionRef => {
              const collection = collectionsMap[collectionRef.name];
              if (collection) {
                collection.items.forEach(weapon => {
                  if (weapon.type === 'Weapon') itemPool.add(weapon);
                });
              }
            });
          }

          // Step 2b: Get rare items (knives/gloves).
          if (crate.contains_rare) {
            crate.contains_rare.forEach(rareItemRef => {
              const rareItem = skinsById[rareItemRef.id];
              if (rareItem) itemPool.add(rareItem);
            });
          }
          
          acc[crate.name] = {
            name: crate.name,
            image: crate.image,
            items: Array.from(itemPool)
          };

          return acc;
        }, {});
        
        setData({ 
            collections: collectionsMap, 
            cases: casesMap, 
            agents: allAgents, 
            stickers: allStickers, 
            graffiti: allGraffiti, 
            patches: allPatches,
            musicKits: allMusicKits,
            tools: allTools,
            keychains: allKeychains
        });

      } catch (e) {
        console.error("Fatal error during data processing:", e);
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    processData();
  }, []);

  // Simple state-based router to display the correct page.
  const renderContent = () => {
    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} />;

    const pageKey = `${view.page}-${view.name || 'home'}`;

    switch (view.page) {
      case 'collections': return <ListPage key={pageKey} title="Collections" categories={Object.values(data.collections)} setView={setView} type="collection" />;
      case 'cases': return <ListPage key={pageKey} title="Cases" categories={Object.values(data.cases)} setView={setView} type="case" />;
      case 'agents': return <ItemListPage key={pageKey} collection={{ name: 'Agents', items: data.agents }} setView={setView} />;
      case 'stickers': return <ItemListPage key={pageKey} collection={{ name: 'Stickers', items: data.stickers }} setView={setView} />;
      case 'graffiti': return <ItemListPage key={pageKey} collection={{ name: 'Graffiti', items: data.graffiti }} setView={setView} />;
      case 'patches': return <ItemListPage key={pageKey} collection={{ name: 'Patches', items: data.patches }} setView={setView} />;
      case 'musicKits': return <ItemListPage key={pageKey} collection={{ name: 'Music Kits', items: data.musicKits }} setView={setView} />;
      case 'tools': return <ItemListPage key={pageKey} collection={{ name: 'Tools & Keys', items: data.tools }} setView={setView} />;
      case 'keychains': return <ItemListPage key={pageKey} collection={{ name: 'Keychains', items: data.keychains }} setView={setView} />;
      case 'collection': return <ItemListPage key={pageKey} collection={data.collections[view.name]} setView={setView} />;
      case 'case': return <ItemListPage key={pageKey} collection={data.cases[view.name]} setView={setView} />;
      default: return <HomePage setView={setView} cases={Object.values(data.cases)} collections={Object.values(data.collections)} />;
    }
  };

  return <div className="bg-gray-900 min-h-screen text-gray-200 font-sans">{renderContent()}</div>;
}

// =================================================================================================
// --- UI Components (Structured as if they were in separate files) ---
// =================================================================================================

const Header = ({ showBackButton = false, setView }) => (
  <header className="sticky top-0 bg-gray-900/70 backdrop-blur-lg border-b border-gray-700/50 z-50">
    <nav className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <button onClick={() => setView({ page: 'home' })} className="text-xl font-bold text-white transition-opacity hover:opacity-80 flex items-center gap-2"><HomeIcon /> CS:GO Item Stash</button>
      {showBackButton && <button onClick={() => setView({ page: 'home' })} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">&larr; Back to Home</button>}
    </nav>
  </header>
);

const Footer = () => (
    <footer className="mt-16 border-t border-gray-800"><div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm"><p>Fan project. Not affiliated with Valve Corp.</p><p>All item data provided by the <a href="https://github.com/ByMykel/CSGO-API" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">CSGO-API project</a>.</p></div></footer>
);

const HomePage = ({ setView, cases, collections }) => {
    const mainCategories = [
        { name: 'Cases', page: 'cases' },
        { name: 'Collections', page: 'collections' },
        { name: 'Agents', page: 'agents' },
        { name: 'Stickers', page: 'stickers' },
        { name: 'Music Kits', page: 'musicKits' },
        { name: 'Patches', page: 'patches' },
        { name: 'Graffiti', page: 'graffiti' },
        { name: 'Keychains', page: 'keychains' },
        { name: 'Tools & Keys', page: 'tools' },
    ];
    
    const featuredCases = useMemo(() => cases.sort(() => 0.5 - Math.random()).slice(0, 4), [cases]);
    const featuredCollections = useMemo(() => collections.sort(() => 0.5 - Math.random()).slice(0, 4), [collections]);

    return (
        <>
            <Header setView={setView} />
            <main className="container mx-auto p-4 sm:p-6 lg:px-8">
                <div className="text-center my-12"><h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight">Item Database</h1><p className="text-gray-400 mt-4 max-w-2xl mx-auto">An unofficial fan-made browser for CS:GO items, skins, and more. Built with data from the CSGO-API project.</p></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mainCategories.map(cat => (
                        <button key={cat.name} onClick={() => setView({ page: cat.page })} className="group block bg-gray-800/50 p-6 rounded-lg hover:bg-gray-700/50 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/10 transform hover:-translate-y-1 text-left border border-gray-700/50">
                            <h2 className="text-2xl font-bold text-white">{cat.name}</h2>
                            <p className="text-gray-400 text-sm mt-1">Browse all {cat.name.toLowerCase()}</p>
                        </button>
                    ))}
                </div>

                <section className="mt-16">
                    <h2 className="text-3xl font-bold text-white border-b border-gray-700 pb-3 mb-6">Featured Cases</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {featuredCases.map(c => c && <CategoryCard key={c.name} category={c} type="case" setView={setView} />)}
                    </div>
                </section>
                
                <section className="mt-16">
                    <h2 className="text-3xl font-bold text-white border-b border-gray-700 pb-3 mb-6">Featured Collections</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {featuredCollections.map(c => c && <CategoryCard key={c.name} category={c} type="collection" setView={setView} />)}
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
};

const ListPage = ({ title, categories, setView, type }) => (
    <>
        <Header showBackButton={true} setView={setView} />
        <main className="container mx-auto p-4 sm:p-6 lg:px-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight text-center mb-12">{title}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {categories.filter(c => c).sort((a, b) => a.name.localeCompare(b.name)).map(c => <CategoryCard key={c.name} category={c} type={type} setView={setView} />)}
            </div>
        </main>
        <Footer />
    </>
);

const ItemListPage = ({ collection, setView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState('default');
  const [selectedItem, setSelectedItem] = useState(null);

  const filteredAndSortedItems = useMemo(() => {
    if (!collection?.items) return [];
    let items = [...collection.items];
    if (searchTerm) items = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (sort === 'name_asc') items.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'name_desc') items.sort((a, b) => b.name.localeCompare(a.name));
    return items;
  }, [collection, searchTerm, sort]);

  if (!collection) return <ErrorMessage message="The requested collection or case could not be found." />;

  return (
    <>
      <Header showBackButton={true} setView={setView} />
      <main className="container mx-auto p-4 sm:p-6 lg:px-8">
        <div className="text-center mb-8"><h1 className="text-4xl sm:text-5xl font-bold text-white">{collection.name}</h1></div>
        <div className="flex flex-col md:flex-row gap-4 mb-8 sticky top-[65px] bg-gray-900/80 backdrop-blur-lg py-4 z-40 rounded-b-xl px-4 -mx-4"><div className="relative flex-grow"><input type="text" placeholder={`Search in ${collection.name}...`} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setSearchTerm(e.target.value)} /><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div></div><select className="bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setSort(e.target.value)}><option value="default">Sort by...</option><option value="name_asc">Name (A-Z)</option><option value="name_desc">Name (Z-A)</option></select></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">{filteredAndSortedItems.map(item => <ItemCard key={item.id} item={item} onSelect={setSelectedItem} />)}</div>
        {filteredAndSortedItems.length === 0 && <p className="text-center text-gray-400 mt-8">No items match your search.</p>}
      </main>
      <Footer />
      {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </>
  );
};

const CategoryCard = ({ category, type, setView }) => (
  <button onClick={() => setView({ page: type, name: category.name })} className="group block bg-gray-800/50 rounded-lg overflow-hidden hover:bg-gray-700/50 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/10 transform hover:-translate-y-1 text-left border border-gray-700/50"><div className="w-full h-32 flex items-center justify-center p-2 bg-gray-900/50"><img src={category.image} alt={category.name} className="max-h-full max-w-full object-contain" onError={(e) => e.target.src = 'https://placehold.co/300x225/030712/4b5563?text=No+Image'} /></div><div className="p-4 border-t border-gray-700/50"><h3 className="text-white font-semibold truncate">{category.name}</h3><p className="text-gray-400 text-sm">{category.items.length} items</p></div></button>
);

const ItemCard = ({ item, onSelect }) => (
  <button onClick={() => onSelect(item)} className="bg-gray-800/50 rounded-lg p-3 flex flex-col items-center text-center cursor-pointer transition-transform transform hover:scale-105 border-b-4" style={{ borderColor: item.rarity?.color || '#6b7280' }}><img src={item.image} alt={item.name} className="w-32 h-32 object-contain mb-3" loading="lazy" onError={(e) => e.target.src = 'https://placehold.co/128x128/111827/4b5563?text=No+Image'}/><h3 className="font-semibold text-sm text-white flex-grow">{item.name}</h3></button>
);

const ItemModal = ({ item, onClose }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}><div className="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl" onClick={(e) => e.stopPropagation()}><button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"><CloseIcon /></button><div className="flex flex-col md:flex-row gap-6"><div className="md:w-1/2 text-center flex flex-col items-center justify-center bg-gray-900/50 p-4 rounded-lg"><img src={item.image} alt={item.name} className="max-w-full h-auto rounded-lg mx-auto" /></div><div className="md:w-1/2"><h2 className="text-3xl font-bold mb-2" style={{color: item.rarity?.color}}>{item.name}</h2><p className="text-gray-300 mb-4 text-sm" dangerouslySetInnerHTML={{ __html: item.description || 'No description available.' }}></p><div className="space-y-2 text-sm border-t border-gray-700 pt-4"><p><strong className="text-gray-400 w-24 inline-block">Rarity:</strong> <span style={{color: item.rarity?.color}}>{item.rarity?.name}</span></p><p><strong className="text-gray-400 w-24 inline-block">Category:</strong> <span>{item.category?.name || 'N/A'}</span></p><p><strong className="text-gray-400 w-24 inline-block">Weapon:</strong> <span>{item.weapon?.name || 'N/A'}</span></p></div></div></div></div></div>
);

const LoadingSpinner = () => <div className="flex items-center justify-center min-h-screen"><div className="text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div><p className="mt-4 text-gray-400">Loading Item Database...</p></div></div>;
const ErrorMessage = ({ message }) => <div className="container mx-auto p-8 text-center"><h2 className="text-2xl text-red-400 font-semibold">An Error Occurred</h2><p className="text-gray-400 mt-2">Could not load the item data. Please check the console for details.</p><p className="text-gray-600 text-sm mt-1">({message})</p></div>;

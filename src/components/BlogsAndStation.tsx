import { useState } from "react";
import { ArrowUpRight, BookOpen, Radio, Landmark, ExternalLink, HelpCircle, X, Compass } from "lucide-react";

interface BlogArticle {
  title: string;
  category: string;
  date: string;
  readTime: string;
  description: string;
  bullets: string[];
}

export default function BlogsAndStation() {
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | null>(null);
  const [showStationModal, setShowStationModal] = useState(false);

  const articles: BlogArticle[] = [
    {
      title: "World Top 10 Hottest Cities Are All in India Again - May 2026",
      category: "Heatwave Alerts",
      date: "28 May 2026",
      readTime: "5 min read",
      description: "An analytical study of heat domes, thermal stagnation, and localized urban micro-climates in northern and central India during the historic summer heatwave.",
      bullets: [
        "Churu and Sri Ganganagar recorded maximum peaks exceeding 44°C for consecutive weeks.",
        "A heavy high-pressure 'Heat Dome' trapped descending air, preventing cooling cloud formation.",
        "Sub-surface groundwater depletion led to reduced evapotranspiration and drier air."
      ]
    },
    {
      title: "Delhi Air Quality 2026 vs 6-Year Historical PM2.5 Data",
      category: "Atmosphere Quality",
      date: "14 Jun 2026",
      readTime: "7 min read",
      description: "Evaluating the combined atmospheric effects of urban concrete expanses, dust storms, and seasonal winds on PM2.5 particulate densities in the National Capital Region.",
      bullets: [
        "PM2.5 levels registered a 14% increment compared to the five-year rolling average.",
        "Stagnant air vectors during high humidity days created heavy smoke and smog condensation layers.",
        "Recommendations include green foliage screens and micro-mist precipitation towers in highly congested districts."
      ]
    },
    {
      title: "What 17 Years of Delhi Temperature Data Reveal About May's Heatwave Escalation",
      category: "Climate Analysis",
      date: "02 Jul 2026",
      readTime: "9 min read",
      description: "Long-term historical temperature data modeling shows a steady 2.1°C thermal escalation in regional summer maximums over the last two decades.",
      bullets: [
        "Concrete expansion indices correlate strongly with nocturnal heat retention (urban heat island).",
        "The number of 'Extreme Heat Days' (above 42°C) has scaled from 6 days per season to 18 days.",
        "Urgent re-wilding of urban drainage corridors could offset localized heat spikes by up to 2.4°C."
      ]
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* 2-Column Bento grid: Weather Station Banner + Recent Blogs title */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Weather Station Banner (5 columns) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900/60 via-indigo-950/70 to-slate-900/60 border border-indigo-500/35 rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden group min-h-[220px]">
          {/* Decorative rotating background radar wave */}
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-indigo-500/10 rounded-full border border-indigo-500/20 animate-ping duration-3000 pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-44 h-44 bg-indigo-500/5 rounded-full pointer-events-none" />

          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-extrabold uppercase tracking-widest text-indigo-300 bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-1 rounded-md w-fit mb-4">
              <Radio size={10} className="text-indigo-400 animate-pulse" />
              INTEGRATION STATUS
            </div>
            <h3 className="text-xl font-black text-white tracking-tight leading-tight">
              Hardware Weather Station
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed max-w-sm">
              Connect your professional weather instruments directly via API keys. Sync backyard PM2.5 sensors and barometric dials in seconds.
            </p>
          </div>

          <button
            onClick={() => setShowStationModal(true)}
            id="station-know-more-btn"
            className="mt-4 px-4 py-2 bg-white text-indigo-950 hover:bg-indigo-50 text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-xl transition-all self-start hover:scale-103"
          >
            Know More
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* Recent Blogs Grid section (7 columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 flex flex-col justify-between h-full shadow-2xl">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white tracking-tight">Recent Blogs On Weather</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Stay updated with curated long-term climate reports, historical comparisons, and academic meteorology studies compiled by our regional intelligence desk.
              </p>
            </div>

            {/* List of micro-articles links */}
            <div className="space-y-3">
              {articles.map((article, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedArticle(article)}
                  className="w-full text-left p-4 bg-slate-950/30 hover:bg-slate-950/50 border border-white/5 hover:border-indigo-500/20 rounded-2xl flex items-start justify-between gap-4 transition-all group cursor-pointer"
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-indigo-400 uppercase">
                      <span>{article.category}</span>
                      <span>•</span>
                      <span>{article.date}</span>
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300 block truncate transition-colors leading-snug">
                      {article.title}
                    </span>
                  </div>
                  <span className="text-slate-500 group-hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-all">
                    <ArrowUpRight size={14} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Blog Article Detail Modal popup */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg relative shadow-2xl animate-fade-in max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedArticle(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all"
            >
              <X size={16} />
            </button>

            <span className="text-[9px] font-mono font-bold bg-indigo-500/25 text-indigo-400 px-2 py-0.5 rounded uppercase tracking-wider">
              {selectedArticle.category}
            </span>
            <span className="text-[10px] text-slate-500 font-mono ml-3 font-semibold">{selectedArticle.date} • {selectedArticle.readTime}</span>
            
            <h4 className="text-lg font-black text-white mt-3 mb-4 leading-snug">{selectedArticle.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium mb-6">{selectedArticle.description}</p>
            
            <h5 className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-indigo-300 mb-3 border-b border-white/5 pb-2">Key Insights</h5>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              {selectedArticle.bullets.map((bullet, i) => (
                <li key={i} className="flex gap-2.5 items-start">
                  <span className="text-indigo-400 font-bold mt-0.5">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => setSelectedArticle(null)}
              className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-white/5"
            >
              Close Article
            </button>
          </div>
        </div>
      )}

      {/* Weather Station Info Modal */}
      {showStationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 w-full max-w-md relative shadow-2xl animate-fade-in">
            <button 
              onClick={() => setShowStationModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all"
            >
              <X size={16} />
            </button>

            <Compass className="w-10 h-10 text-indigo-400 mb-3 animate-spin-slow" />
            <h4 className="text-base font-black text-white mb-2">Weather Station Integrations</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium mb-4">
              SkySense supports standard TCP/IP and HTTP REST broadcast streams from popular residential and professional meteorological stations, including:
            </p>
            
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 font-mono font-semibold mb-5">
              <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> AmbientWeather
              </div>
              <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500" /> Davis Vantage Pro
              </div>
              <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-500" /> PurpleAir PM2.5
              </div>
              <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> Netatmo Weather
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed">
              * To register your hardware station, consult the developers hub in your settings panel and generate an OAuth callback endpoint.
            </p>

            <button 
              onClick={() => setShowStationModal(false)}
              className="mt-5 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

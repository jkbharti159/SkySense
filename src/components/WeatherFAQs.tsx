import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export default function WeatherFAQs() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "What is PM2.5 and why is it important in the AQI calculation?",
      answer: "PM2.5 refers to fine particulate matter suspended in the air that is 2.5 micrometers or smaller in diameter. These tiny particles can penetrate deep into the lungs and enter the bloodstream, presenting serious biological health risks. In Air Quality Index (AQI) calculations, PM2.5 is a critical index pollutant; when levels rise due to industrial smoke, exhaust, or stagnation, the AQI is immediately flagged to protect children, elderly, and active individuals."
    },
    {
      question: "How accurate is the 10-Day weather forecast and how often does it update?",
      answer: "The first 3 to 5 days of a meteorological forecast have an accuracy rating exceeding 90% as they are backed by real-time satellites and high-altitude weather balloons. For days 6 through 10, the forecast relies on ensemble modeling which traces dynamic trends; these have a lower precision but provide outstanding general planning outlooks. Our databases run automated synchronization cycles every 15 minutes to ingest new NOAA, ECMWF, and Open-Meteo vectors."
    },
    {
      question: "What factors determine the outdoor activity and travel scores on SkySense?",
      answer: "SkySense uses a proprietary meteorological planning engine backed by Gemini AI. The algorithm evaluates temperature comfort (keeping values between 18°C and 25°C as optimal), relative humidity (avoiding sticky conditions), wind speeds (restricting high winds that disrupt bicycling or aviation), precipitation probability, and air quality index. If the AQI exceeds 100 or rain chances exceed 40%, the score is penalized to safeguard users."
    },
    {
      question: "What is precipitation depth in millimeters and how does it relate to rainfall duration?",
      answer: "Precipitation depth represents the height of liquid water that would accumulate on a flat surface if all rainfall were captured during a specific timeframe, measured in millimeters (mm). For example, 1 mm of rain represents 1 liter of water per square meter. A depth of 1-3 mm usually indicates light, intermittent showers, whereas depths exceeding 10 mm indicate torrential, sustained downpours capable of causing localized urban runoff and street flooding."
    },
    {
      question: "What is the UV Index and how much sun exposure is safe without protection?",
      answer: "The UV (Ultraviolet) Index is an international scientific standard scale of the strength of sunburn-producing ultraviolet radiation at a particular place and time. An index of 0-2 (Low) is safe for most skin types, while 3-5 (Moderate) suggests wearing sunscreen. When the UV index scales to 6-7 (High) or 8-10 (Very High), skin damage can occur in less than 15-20 minutes, requiring wide-brimmed hats, protective clothing, sunglasses, and high SPF sun block."
    },
    {
      question: "How does SkySense calculate local micro-climates for sub-locations?",
      answer: "SkySense models sub-location micro-climates using real-time barometric pressure differentials, elevation contour mapping, and urban heat island (UHI) coefficient modifiers. Densely built urban sectors with high concrete concentrations are adjusted upwards by 1.2°C to 2.0°C compared to nearby forested parks or waterfront municipalities, resulting in incredibly precise local neighborhood conditions."
    }
  ];

  const toggleItem = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle size={20} className="text-indigo-400" />
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">FAQs About Weather Conditions</h3>
          <p className="text-xs text-slate-400">Essential answers to key meteorological questions and concepts</p>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div 
              key={idx} 
              className="bg-slate-950/20 hover:bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => toggleItem(idx)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 text-xs font-bold text-white select-none"
              >
                <span className="leading-relaxed">{faq.question}</span>
                <span className="text-slate-400 shrink-0">
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-[11px] text-slate-300 leading-relaxed border-t border-white/5 bg-slate-950/10 animate-slide-down font-medium">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

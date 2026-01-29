import { useState, useEffect } from 'react';
import Toast from '../../components/Toast';
import { submitEmail, getWaitlistCount } from '../../api/waitlist';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null); // Start as null to show loading
  const [spotsLeft, setSpotsLeft] = useState(153);
  const [isVisible, setIsVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    setIsVisible(true);

    // Initial fetch
    const fetchCount = async () => {
      try {
        const result = await getWaitlistCount();
        if (result.success) {
          // Base count of 503 plus actual database entries
          setWaitlistCount(503 + result.count);
        } else {
          // Fallback if API fails
          setWaitlistCount(503);
        }
      } catch (e) {
        setWaitlistCount(503);
      }
    };

    fetchCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchCount();
      // Decrement spots occasionally to keep urgency alive, but don't go below 0
      setSpotsLeft(prev => Math.max(0, prev - Math.floor(Math.random() * 2)));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await submitEmail(email);

      if (result.success) {
        setIsSubmitted(true);
        setEmail('');
        setWaitlistCount(prev => (prev || 503) + 1);
        setSpotsLeft(prev => Math.max(0, prev - 1));
        setToast({ message: '🎉 You\'ve been added to the waitlist!', type: 'success' });
      } else {
        setToast({ message: result.error || 'Failed to join waitlist', type: 'error' });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setToast({ message: 'An error occurred. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-inter overflow-x-hidden">
      {/* Floating Urgency Bar */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-600 to-orange-500 text-white py-2 px-4 text-center z-50 shadow-lg">
        <div className="flex items-center justify-center gap-4 text-sm font-medium">
          <span className="flex items-center gap-2">
            <i className="ri-fire-fill animate-pulse"></i>
            <strong>{spotsLeft}</strong> spots left in this wave
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">
            {waitlistCount !== null ? (
              `${waitlistCount.toLocaleString()} builders already joined`
            ) : (
              <span className="animate-pulse">Loading count...</span>
            )}
          </span>
        </div>
      </div>

      {/* Rest of the component... */}
      {/* Search specifically for the next usage of waitlistCount which is in the Hero or later? No, I need to check where else it is used. */}
      {/* It is used in the CTA success message "You're #${waitlistCount.toLocaleString()} on the list" */}
      {/* And in the Hero "2,861 builders already joined" replacement? No, let's look at the file content again. */}
      {/* Line 76: <span className="hidden sm:inline">{waitlistCount.toLocaleString()} builders already joined</span> */}
      {/* Wait, the ReplaceFileContent input above replaces the start of the function up to the Sticky Bar rendering. */}
      {/* I need to make sure I caught all usages or allow the rest to work. */}
      {/* The 'lines 5-78' cover the state init and the Sticky Bar. */}
      {/* But wait, waitlistCount is used later in lines 193 and 547 (Success messages). */}
      {/* I need to handle 'null' there too or TS will complain/runtime crash. */}
      {/* So I should probably provide a valid fallback in the render or handle null everywhere. */}
      {/* Simpler: Initialize to null, but in the success message rendering, we only show success if isSubmitted is true. */}
      {/* If isSubmitted is true, waitlistCount SHOULD be set (because we successfully submitted). */}
      {/* However, the "Join {waitlistCount}+ builders" text at line 501 needs handling. */}


      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-16">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className={`max-w-5xl mx-auto text-center relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Logo */}
          <div className="mb-8 animate-fade-in">
            <img
              src="Lavoo Official Logo.png"
              alt="Lavoo Logo"
              className="h-64 sm:h-80 mx-auto"
            />
          </div>

          {/* Status Badge with Pulse */}
          <div className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-orange-100 to-orange-50 text-orange-600 rounded-full text-sm font-semibold mb-8 shadow-lg border border-orange-200 animate-fade-in-up animation-delay-200">
            <div className="relative flex items-center">
              <span className="flex h-3 w-3 relative mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              <span>Launching Soon • Wave 3 Opening</span>
            </div>
          </div>

          {/* Main Headline with Gradient */}
          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight animate-fade-in-up animation-delay-400">
            Decision clarity<br />
            <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 bg-clip-text text-transparent animate-gradient">is coming.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4 max-w-4xl mx-auto leading-relaxed animate-fade-in-up animation-delay-600">
            Lavoo is the first business decision engine built for the solo economy.
          </p>

          <p className="text-xl md:text-2xl text-gray-700 mb-6 max-w-3xl mx-auto animate-fade-in-up animation-delay-800">
            It cuts through the mess in your business and tells you <span className="font-semibold text-orange-600">what to fix next.</span>
          </p>

          {/* Value Props with Icons */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-lg font-medium text-gray-800 mb-12 animate-fade-in-up animation-delay-1000">
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-close-line text-white text-sm"></i>
              </div>
              No noise.
            </div>
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-time-line text-white text-sm"></i>
              </div>
              No time wasting.
            </div>
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="ri-flashlight-fill text-white text-sm"></i>
              </div>
              Just clarity.
            </div>
          </div>

          {/* CTA Form with Enhanced Design */}
          <div className="max-w-xl mx-auto animate-fade-in-up animation-delay-1200">
            {!isSubmitted ? (
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-orange-400 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <form onSubmit={handleSubmit} className="relative bg-white rounded-2xl p-2 shadow-2xl border-2 border-orange-100" data-readdy-form>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="flex-1 px-6 py-5 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all w-full sm:w-auto"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group relative px-4 sm:px-8 py-5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl text-lg font-bold hover:from-orange-700 hover:to-orange-600 transition-all cursor-pointer disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none w-full sm:w-auto flex justify-center whitespace-normal"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isSubmitting ? (
                          <>
                            <i className="ri-loader-4-line animate-spin"></i>
                            Joining...
                          </>
                        ) : (
                          <>
                            Join the waitlist
                            <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-8 shadow-xl animate-scale-in">
                <div className="flex items-center justify-center text-green-600 mb-3">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mr-3 animate-bounce-once">
                    <i className="ri-check-line text-3xl text-white font-bold"></i>
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-bold block">You're in!</span>
                    <span className="text-green-700 text-sm">Position #{waitlistCount?.toLocaleString() || '...'}</span>
                  </div>
                </div>
                <p className="text-gray-700 text-lg">We'll send your invite when the next wave opens.</p>
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-700">
                  <i className="ri-gift-line"></i>
                  <span className="font-medium">Founding member pricing locked in</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6 text-sm text-gray-600">
              <span className="flex items-center gap-1 font-medium">
                <i className="ri-vip-crown-line text-orange-500"></i>
                Early access • Limited invites
              </span>
              <span className="hidden sm:inline text-gray-400">•</span>
              <span className="flex items-center gap-1 font-medium">
                <i className="ri-rocket-line text-orange-500"></i>
                Beta access sent in waves
              </span>
            </div>

            {/* Video Section */}
            <div className="mt-16 w-full max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-orange-100 bg-black aspect-video flex items-center justify-center relative group">
              <video
                src="/Lavoo Waitlist Video Main.mp4"
                controls
                className="w-full h-full object-cover"
                poster="/Lavoo Official Logo.png"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Social Proof
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-white flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <i className="ri-user-star-fill text-sm"></i>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <i className="ri-briefcase-fill text-sm"></i>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-white flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <i className="ri-lightbulb-flash-fill text-sm"></i>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <i className="ri-rocket-fill text-sm"></i>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 border-2 border-white flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform relative overflow-hidden">
                  <i className="ri-heart-fill text-sm"></i>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
                {/* <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg relative">
                  <span className="text-orange-400">+</span>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">∞</span>
                  </div>
                </div> *
              </div>
            </div> */}
          </div>
        </div>
      </section>

      {/* Problem Section with Visual Impact */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent"></div>

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-red-100 text-red-600 rounded-full text-sm font-semibold">
            The Hidden Trap
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-12">The problem</h2>
          <div className="space-y-8 text-xl md:text-2xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
            <p className="text-gray-600">Most founders don't struggle because they're bad at business.</p>
            <p className="text-3xl md:text-4xl font-bold text-black leading-tight">They struggle because <span className="text-red-600">everything feels important.</span></p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-red-200 hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <i className="ri-time-line text-4xl text-red-600"></i>
                </div>
                <p className="text-xl font-semibold text-gray-800">So they work harder.</p>
                <p className="text-sm text-gray-500 mt-2">More hours, same results</p>
              </div>
              <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-red-200 hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <i className="ri-tools-line text-4xl text-red-600"></i>
                </div>
                <p className="text-xl font-semibold text-gray-800">They add tools</p>
                <p className="text-sm text-gray-500 mt-2">More complexity, less clarity</p>
              </div>
              <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-red-200 hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <i className="ri-volume-up-line text-4xl text-red-600"></i>
                </div>
                <p className="text-xl font-semibold text-gray-800">They fix what's loud.</p>
                <p className="text-sm text-gray-500 mt-2">Urgent, not important</p>
              </div>
            </div>

            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 rounded-3xl blur-xl opacity-20"></div>
              <div className="relative bg-gradient-to-br from-red-50 to-red-100 rounded-3xl p-10 border-l-8 border-red-500 shadow-xl">
                <p className="text-2xl md:text-3xl font-bold text-red-700 mb-3">And the real problem stays hidden.</p>
                <p className="text-xl text-red-600 font-semibold">That's the dangerous part.</p>
                <div className="mt-6 inline-flex items-center gap-2 text-red-700 font-medium">
                  <i className="ri-alert-line text-2xl"></i>
                  <span>Sound familiar?</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shift Section with Animation */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-6 px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold">
              The Breakthrough
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">The shift</h2>
            <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">Lavoo changes how decisions get made.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start group">
                <div className="w-4 h-4 bg-gray-300 rounded-full mt-2 mr-4 flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                <p className="text-xl text-gray-500 line-through">Instead of fixing what’s loud,</p>
              </div>
              <div className="flex items-start group bg-orange-50 rounded-2xl p-6 border-l-4 border-orange-500 hover:shadow-lg transition-all">
                <div className="w-4 h-4 bg-orange-500 rounded-full mt-2 mr-4 flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                <p className="text-xl font-medium text-gray-800">Lavoo examines your business the way a doctor examines a patient</p>
              </div>
              <div className="flex items-start group bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl p-6 border-l-4 border-orange-600 hover:shadow-xl transition-all">
                <div className="w-4 h-4 bg-orange-600 rounded-full mt-2 mr-4 flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                <p className="text-xl font-bold text-gray-900">and points to the real bottleneck.</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-600 to-orange-400 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-12 shadow-2xl text-white text-center transform group-hover:scale-105 transition-transform">
                <div className="text-8xl md:text-9xl font-black mb-4 animate-pulse">1</div>
                <p className="text-2xl font-bold mb-3">Not ten things.</p>
                <p className="text-xl opacity-90">The one that matters now.</p>
                <div className="mt-6 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                  <i className="ri-focus-line"></i>
                  <span>Laser-focused clarity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Cards */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-6 px-4 py-2 bg-green-100 text-green-600 rounded-full text-sm font-semibold">
              Real Results
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">What you actually get</h2>
            <p className="text-2xl text-gray-600">With Lavoo, you'll know:</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {[
              { icon: 'ri-speed-line', title: "What's slowing you down", desc: 'Identify the real bottlenecks in your business flow.', color: 'orange' },
              { icon: 'ri-question-line', title: "Why it's happening", desc: 'Understand the root causes behind your challenges.', color: 'orange' },
              { icon: 'ri-tools-fill', title: 'What to fix next', desc: 'Get clear direction on your highest impact action.', color: 'orange' },
              { icon: 'ri-time-line', title: 'What can wait', desc: 'Know what to deprioritize so you can focus.', color: 'orange' }
            ].map((item, idx) => (
              <div key={idx} className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-orange-300 hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all">
                  <i className={`${item.icon} text-3xl text-orange-600`}></i>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">{item.title}</h3>
                <p className="text-gray-600 text-lg">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center bg-gradient-to-r from-orange-50 via-white to-orange-50 rounded-3xl p-12 border-2 border-orange-200">
            <p className="text-3xl font-bold mb-4 text-gray-900">That's it.</p>
            <div className="flex flex-col md:flex-row justify-center items-center gap-3 text-xl font-medium">
              <span className="flex items-center gap-2">
                <span className="text-gray-700">Clarity creates momentum</span>
                <i className="ri-arrow-right-line text-orange-500 text-2xl"></i>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-gray-700">Momentum creates results</span>
                <i className="ri-trophy-line text-orange-500 text-2xl"></i>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-6 px-4 py-2 bg-purple-100 text-purple-600 rounded-full text-sm font-semibold">
              Built For You
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">Who it's for</h2>
            <p className="text-2xl text-gray-600">Lavoo is built for people who make decisions for a living.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {[
              { title: 'Solo founders', desc: 'doing everything themselves.', icon: 'ri-user-star-line' },
              { title: 'Creators', desc: 'turning attention into income.', icon: 'ri-lightbulb-flash-line' },
              { title: 'Consultants', desc: 'who need faster answers for clients.', icon: 'ri-briefcase-line' },
              { title: 'Managers', desc: 'who want direction, not dashboards.', icon: 'ri-dashboard-line' }
            ].map((item, idx) => (
              <div key={idx} className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border-l-4 border-orange-500 hover:border-orange-600 transition-all hover:shadow-xl">
                <div className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                  <i className={`${item.icon} text-5xl text-orange-600`}></i>
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">{item.title}</h3>
                <p className="text-lg text-gray-700">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-gray-900 to-gray-700 rounded-3xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-gradient-to-br from-gray-900 to-black text-white rounded-3xl p-12 text-center shadow-2xl">
              <p className="text-2xl md:text-3xl mb-4">If clarity is how you win,</p>
              <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">you'll feel at home here.</p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <i className="ri-home-heart-line text-orange-400 text-2xl"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Early Access Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-6 px-4 py-2 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold animate-pulse">
              <i className="ri-vip-crown-fill mr-1"></i>
              Exclusive Access
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">Early access</h2>
            <p className="text-xl text-gray-600 mb-2">We're opening Lavoo slowly.</p>
            <p className="text-lg text-gray-500">Not to create hype, but because early access shapes the product.</p>
          </div>

          <div className="bg-white rounded-3xl p-10 shadow-2xl border-2 border-orange-200">
            <h3 className="text-3xl font-bold mb-8 text-center">Waitlist members are the first to:</h3>
            <div className="space-y-6 max-w-3xl mx-auto mb-10">
              {[
                { text: 'Access the beta before public launch', icon: 'ri-rocket-line', color: 'green' },
                { text: 'Receive founding pricing for the first three months', icon: 'ri-price-tag-3-line', color: 'green' },
                { text: 'Shape the product with direct feedback', icon: 'ri-feedback-line', color: 'green' },
                { text: 'Get priority support', icon: 'ri-customer-service-2-line', color: 'green' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start group bg-green-50 rounded-xl p-5 hover:bg-green-100 transition-all">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mr-4 group-hover:scale-110 transition-transform">
                    <i className={`${item.icon} text-white`}></i>
                  </div>
                  <p className="text-lg font-medium text-gray-800 pt-1">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-8 border-2 border-orange-300">
              <div className="flex items-center justify-center gap-3 mb-3">
                <i className="ri-time-line text-3xl text-orange-600"></i>
                <p className="text-xl font-bold text-gray-900">Invites go out in waves.</p>
              </div>
              <p className="text-center text-gray-700 text-lg">When a wave fills, we pause.</p>
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                  <i className="ri-fire-fill"></i>
                  Only {spotsLeft} spots left in Wave 3
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-orange-50 to-orange-100 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            If you're doing a lot... but<br />
            <span className="bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">progress feels random</span>
          </h2>
          <p className="text-3xl md:text-4xl font-semibold text-gray-700 mb-4">you already know something is missing.</p>
          <p className="text-xl text-gray-600 mb-12">Join {waitlistCount?.toLocaleString() || '...'}+ builders who want clarity, not noise.</p>

          <div className="max-w-xl mx-auto">
            {!isSubmitted ? (
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 rounded-3xl blur-lg opacity-30 animate-pulse"></div>
                <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl p-3 shadow-2xl border-4 border-orange-200" data-readdy-form>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="flex-1 px-8 py-6 border-2 border-gray-200 rounded-2xl text-lg focus:outline-none focus:ring-4 focus:ring-orange-300 focus:border-orange-500 transition-all"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group relative px-4 sm:px-12 py-6 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl text-xl font-black hover:from-orange-700 hover:to-orange-600 transition-all cursor-pointer disabled:opacity-50 shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:transform-none whitespace-normal w-full sm:w-auto flex justify-center"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isSubmitting ? (
                          <>
                            <i className="ri-loader-4-line animate-spin text-2xl"></i>
                            Joining...
                          </>
                        ) : (
                          <>
                            Claim Your Spot
                            <i className="ri-arrow-right-line text-2xl group-hover:translate-x-2 transition-transform"></i>
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-4 border-green-400 rounded-3xl p-12 shadow-2xl animate-scale-in">
                <div className="flex flex-col items-center justify-center text-green-600 mb-4">
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-4 animate-bounce-once shadow-xl">
                    <i className="ri-check-line text-5xl text-white font-bold"></i>
                  </div>
                  <span className="text-4xl font-black block mb-2">Welcome aboard!</span>
                  <span className="text-green-700 text-xl font-semibold">You're #{waitlistCount?.toLocaleString() || '...'} on the list</span>
                </div>
                <p className="text-gray-700 text-xl mb-4">We'll send your invite when Wave 3 opens.</p>
                <div className="flex flex-col gap-3 mt-6">
                  <div className="flex items-center justify-center gap-2 text-green-700 font-bold">
                    <i className="ri-gift-line text-xl"></i>
                    <span>Founding member pricing locked in</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-green-700 font-bold">
                    <i className="ri-vip-crown-fill text-xl"></i>
                    <span>Priority access guaranteed</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600 mt-6 font-medium">
              <i className="ri-shield-check-line text-green-600 mr-1"></i>
              No spam. Just your invite, updates, and early access.
            </p>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <i className="ri-lock-line text-orange-500"></i>
                <span>Your data is secure</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ri-mail-line text-orange-500"></i>
                <span>Unsubscribe anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ri-timer-line text-orange-500"></i>
                <span>Instant confirmation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 mb-12 items-center text-center md:text-left">

            {/* Logo Section */}
            <div className="flex flex-col items-center md:items-start">
              <img
                src="Lavoo Official Logo.png"
                alt="Business Decision engine"
                className="h-32 w-auto mb-6 brightness-0 invert"
              />
            </div>

            {/* Centralized Text and Socials */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-white/90 mb-6 text-xl font-medium">
                The business decision engine
              </p>
              <div className="flex gap-4 justify-center">
                <a
                  href="https://www.linkedin.com/search/results/all/?heroEntityKey=urn%3Ali%3Aorganization%3A106447017&keywords=AITugo&origin=ENTITY_SEARCH_HOME_HISTORY&sid=%40)H"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <i className="ri-linkedin-fill text-2xl"></i>
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <i className="ri-twitter-x-fill text-2xl"></i>
                </a>
                <a
                  href="https://www.instagram.com/aitugo_?igsh=YzRtNjRjczFwdW51"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <i className="ri-instagram-fill text-2xl"></i>
                </a>
              </div>
            </div>

            {/* Empty column for grid balance if needed, or put other links here */}
            <div></div>

          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/90 text-sm text-center md:text-left">
                © {currentYear} Lavoo. All rights reserved.
              </p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                <a href="#waitlist" className="text-white/90 text-sm hover:text-white transition-colors cursor-pointer whitespace-nowrap">
                  Privacy Policy
                </a>

              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            {/* Launch Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#133bb7] text-white text-sm font-medium mb-8 animate-pulse">
              🚀 DeleMate is now live!
            </div>
            
            {/* Main Headline */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
              Send your{" "}
              <span className="text-[#133bb7] relative">
                Parcels
                <svg className="absolute -bottom-1 left-0 w-full h-2 text-[#133bb7]/20" viewBox="0 0 100 8" fill="currentColor">
                  <path d="M0,6 Q25,2 50,6 T100,6" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </span>
              <br />
              seamlessly with DeleMate
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed tracking-tight">
              DeleMate makes sending packages easier and cheaper than ever before. 
              Just sign up and tell us where you want your package to go.
            </p>
            
            {/* CTA Section */}
            <div className="flex flex-col items-center gap-6 mb-12">
              <Link
                href="/login"
                className="bg-[#133bb7] hover:bg-[#0f2a8a] text-white font-semibold py-3 px-8 rounded-full text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Get Started Now
              </Link>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1 tracking-tight">Special Launch Offer</p>
                <p className="text-xl font-bold text-[#133bb7] tracking-tight">Get up to 60% off on your first order</p>
              </div>
            </div>
            
            {/* Visual Elements */}
            <div className="relative max-w-5xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
                {/* From Location */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-8 shadow-xl border border-gray-200/50 transform hover:scale-105 transition-all duration-300 w-full max-w-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#133bb7] to-[#0f2a8a] rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 text-center tracking-tight">Parcel from you</h3>
                  <p className="text-gray-600 text-center leading-relaxed">Package your items securely and prepare for pickup</p>
                </div>
                
                {/* Arrow */}
                <div className="hidden md:flex justify-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-[#133bb7] to-[#0f2a8a] rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
                
                {/* To Destination */}
                <div className="bg-gradient-to-br from-white to-green-50 rounded-3xl p-8 shadow-xl border border-gray-200/50 transform hover:scale-105 transition-all duration-300 w-full max-w-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 text-center tracking-tight">Parcel to destination</h3>
                  <p className="text-gray-600 text-center leading-relaxed">Delivered safely by our trusted traveler network</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#133bb7]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Why Choose DeleMate?
            </h2>
            <div className="w-24 h-1 bg-[#133bb7] mx-auto rounded-full"></div>
          </div>
          
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Large Feature Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#133bb7] to-[#0f2a8a] rounded-3xl p-8 text-white">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 tracking-tight">Save Up to 60%</h3>
              <p className="text-blue-100 leading-relaxed">
                Traditional courier services charge premium rates. With DeleMate's peer-to-peer network, 
                you pay only what travelers charge - often 60% less than conventional delivery services.
              </p>
            </div>
            
            {/* Fast Delivery */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-3xl p-6 border border-green-200">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2 tracking-tight">Lightning Fast</h4>
              <p className="text-gray-600 text-sm leading-relaxed">Quick delivery through our network of verified travelers</p>
            </div>
            
            {/* Secure */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-3xl p-6 border border-purple-200">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2 tracking-tight">100% Secure</h4>
              <p className="text-gray-600 text-sm leading-relaxed">Verified travelers and secure package handling</p>
            </div>
            
            {/* Easy to Use */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-3xl p-6 border border-orange-200">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2 tracking-tight">Super Easy</h4>
              <p className="text-gray-600 text-sm leading-relaxed">Simple booking process in just a few clicks</p>
            </div>
            
            {/* Real-time Tracking */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-3xl p-6 border border-blue-200">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2 tracking-tight">Live Tracking</h4>
              <p className="text-gray-600 text-sm leading-relaxed">Track your package in real-time from pickup to delivery</p>
            </div>
            
            {/* Eco Friendly */}
            <div className="lg:col-span-2 bg-gradient-to-br from-emerald-50 to-green-100 rounded-3xl p-6 border border-emerald-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2 tracking-tight">Eco-Friendly Delivery</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Reduce carbon footprint by utilizing existing travel routes instead of dedicated delivery vehicles. 
                    Every package sent through DeleMate helps make delivery more sustainable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              About DeleMate 👋
            </h2>
            <div className="w-24 h-1 bg-[#133bb7] mx-auto rounded-full"></div>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-200/50">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center tracking-tight">
                Welcome to DeleMate!
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-8 text-center">
                DeleMate is an innovative peer-to-peer delivery platform designed to make parcel delivery easier, 
                faster, and more affordable. We connect travelers with people who need to send parcels, offering 
                a convenient solution for long-distance deliveries at a fraction of the cost of traditional courier services.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#133bb7] to-[#0f2a8a] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-3 tracking-tight">Peer-to-Peer Network</h4>
                  <p className="text-gray-600 leading-relaxed">
                    Connect with verified travelers going your way. No more waiting for scheduled deliveries or paying premium courier fees.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-3 tracking-tight">Trusted & Verified</h4>
                  <p className="text-gray-600 leading-relaxed">
                    All our travelers are verified with ID checks and ratings. Your packages are in safe hands with our trusted community.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#133bb7] to-[#0f2a8a]">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 tracking-tight">
            Ready to Send Your First Package?
          </h2>
          <p className="text-lg text-blue-100 mb-8 tracking-tight">
            Join thousands of satisfied customers who trust DeleMate for their delivery needs.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center bg-white text-[#133bb7] font-semibold py-3 px-8 rounded-full text-base transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Start Sending Now
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}

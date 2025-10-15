'use client'

interface OrderLoadingProps {
  status: 'checking' | 'waiting'
  timer?: number
}

export default function OrderLoading({ status, timer }: OrderLoadingProps) {
  if (status === 'checking') {
    return (
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-blue-800 font-medium">Finding the best driver for your package...</p>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Searching nearby drivers</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <span>Calculating optimal routes</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <span>Preparing order details</span>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'waiting') {
    return (
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-yellow-600">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Waiting for Driver Response</h3>
          <p className="text-yellow-700 mb-4">We're finding the best driver for your package...</p>
          <div className="text-3xl font-bold text-yellow-800 mb-2">
            {Math.floor(timer! / 60)}:{(timer! % 60).toString().padStart(2, '0')}
          </div>
          <div className="w-full bg-yellow-200 rounded-full h-2">
            <div 
              className="bg-yellow-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${((30 - timer!) / 30) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-yellow-600 mt-2">Time remaining for driver response</p>
        </div>
      </div>
    )
  }

  return null
}

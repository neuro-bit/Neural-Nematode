import ConnectomeVisualization from './components/ConnectomeVisualization'

function App() {
  return (
    <div className="App bg-gray-100 min-h-screen">
      <div className="flex items-center justify-center p-4 bg-gray-200">
        <img 
          src="/favicon.ico" 
          alt="Neural Network" 
          className="w-8 h-8 mr-3"
        />
        <h1 className="font-sans text-2xl font-bold" style={{ color: '#99999' }}>
          DeepWorm - C. elegans Connectome Visualization
        </h1>
      </div>
      <ConnectomeVisualization />
    </div>
  )
}

export default App
import React from "react";
import CSVUploader from "./components/CSVUploader";


function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-2xl font-bold mb-4">CSV Importer</h1>
      <CSVUploader />
    </div>
  );
}

export default App;
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import useAppBuilderStore from "../store/useAppBuilderStore";
import useWorkflowStore from "../store/useWorkflowStore";
import { useParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const AppRunner = () => {
  const { appId } = useParams();
  const { appName, paramsSchema, uiBindings } = useAppBuilderStore(state => ({
    appName: state.appName,
    paramsSchema: state.paramsSchema,
    uiBindings: state.uiBindings,
  }));
  const { workflow } = useWorkflowStore();

  const [inputValues, setInputValues] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize input values from paramsSchema
    const initialValues = {};
    paramsSchema.forEach(param => {
      initialValues[param.name] = param.defaultValue || 
        (param.type === 'number' ? 0 : 
         param.type === 'boolean' ? false : 
         '');
    });
    setInputValues(initialValues);
  }, [paramsSchema]);

  const handleInputChange = (paramName, value) => {
    setInputValues(prev => ({ ...prev, [paramName]: value }));
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      const response = await axios.post(`/api/apps/${appId}/run`, {
        params: inputValues,
      });
      setExecutionResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  // Memoize the rendered components based on uiBindings
  const renderedComponents = useMemo(() => {
    return uiBindings.map(binding => {
      const param = paramsSchema.find(p => p.path === binding.paramPath);
      if (!param) return null;

      const commonProps = {
        key: binding.id,
        label: binding.label || param.name,
        value: inputValues[param.name],
        onChange: (e) => handleInputChange(param.name, e.target.value),
      };

      switch (binding.componentType) {
        case 'input':
          return <Input {...commonProps} />;
        case 'slider':
          // Assuming a Slider component exists
          return <div>Slider placeholder</div>;
        case 'image_output':
           // Assuming an ImageOutput component exists
          return <div>Image Output placeholder</div>;
        default:
          return null;
      }
    });
  }, [uiBindings, paramsSchema, inputValues]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{appName || "Run Application"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Parameters</h3>
            {renderedComponents}
            <Button onClick={handleExecute} disabled={isExecuting}>
              {isExecuting ? "Executing..." : "Run"}
            </Button>
          </div>

          {/* Output Panel */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Result</h3>
            {isExecuting && <div>Loading...</div>}
            {error && <div className="text-red-500">Error: {error}</div>}
            {executionResult && (
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                {JSON.stringify(executionResult, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppRunner;


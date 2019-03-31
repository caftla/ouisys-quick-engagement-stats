import * as React from "react";

const dataFetchReducer = (state, action) => {
  switch (action.type) {
    case "FETCH_INIT":
      return {
        ...state,
        isLoading: true,
        isError: false
      };
    case "FETCH_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: action.payload
      };
    case "FETCH_FAILURE":
      return {
        ...state,
        isLoading: false,
        isError: true,
        error: action.payload
      };
    default:
      throw new Error(state);
  }
};

const useDataApi = (url, initialData, tranfromer = x => x) => {
  // const [url, setUrl] = React.useState(initialUrl);

  const [state, dispatch] = React.useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: initialData
  });

  React.useEffect(
    () => {
      let didCancel = false;

      const fetchData = async () => {
        if (!url) {
          return;
        }

        dispatch({ type: "FETCH_INIT" });

        try {
          console.log("-- fetching ", url);
          const result = await fetch(url).then(x => x.json());

          if (!didCancel) {
            dispatch({ type: "FETCH_SUCCESS", payload: tranfromer(result) });
          }
        } catch (error) {
          if (!didCancel) {
            dispatch({ type: "FETCH_FAILURE", payload: error });
          }
        }
      };

      fetchData();

      return () => {
        didCancel = true;
      };
    },
    [url]
  );

  return { ...state };
};

export default useDataApi;

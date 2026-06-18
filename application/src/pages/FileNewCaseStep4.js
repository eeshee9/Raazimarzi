import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const FileNewCaseStep4 = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate("/user/file-new-case/step3", { replace: true }); }, [navigate]);
  return null;
};

export default FileNewCaseStep4;

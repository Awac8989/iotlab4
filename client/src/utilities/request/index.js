import axios from "axios";
import { toast } from "./../";

const request = ({
  callback = () => {},
  error_callback = () => {},
  method,
  url,
  title,
  withNotification = false,
  data,
}) => {
  const token = localStorage.getItem("iot_token");

  axios({
    url,
    data,
    method,
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  })
    .then((response) => {
      callback(response);
      withNotification === true &&
        toast({ message: title + " with success", type: "success" });
    })
    .catch((error) => {
      toast({
        message: "Error in " + title + "\n\n" + error.message,
        type: "error",
      });
      console.error(error);
      console.log(url);
      error_callback(error);
    });
};

export default request;

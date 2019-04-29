import sinhalascript_map
import unittest


class MainTestCase(unittest.TestCase):

    # check whether all mapping are loaded          // CANNOT CHECK ON LOCAL MACHINE (WITH PYTHON) //
    def test_loadMapping(self):
        sinhalascript_map.loadMapping()
        self.assertEqual(len(sinhalascript_map.sinhalaMap), 20)



if __name__ == '__main__':
    unittest.main()